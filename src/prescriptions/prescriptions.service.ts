import { Injectable, NotFoundException } from '@nestjs/common';
import { PdfService } from '../pdf/pdf.service';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class PrescriptionsService {
  private supabase: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly pdfService: PdfService
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_KEY')!
    );
  }

  async findAllPrescriptions() {
    const { data, error } = await this.supabase
      .from('prescription')
      .select(`
        *,
        appointments:appointment_id (
          id, 
          date,
          patient_id
        )
      `)
      .order('id', { ascending: false });
      
    if (error) throw error;
    return data;
  }



  async findMedicationsByPrescription(id: number) {
    const { data, error } = await this.supabase
      .from('medication')
      .select('*')
      .eq('prescription_id', id);
    
    if (error) throw error;
    return data;
  }

  async findPrescriptionsByAppointment(appointmentId: number) {
    const { data: prescriptions, error } = await this.supabase
      .from('prescription')
      .select('*')
      .eq('appointment_id', appointmentId);
    
    if (error) throw error;
    
    // For each prescription, get its medications
    for (const prescription of prescriptions) {
      const { data: medications } = await this.supabase
        .from('medication')
        .select('*')
        .eq('prescription_id', prescription.id);
      
      prescription.medications = medications || [];
    }
    
    return prescriptions;
  }

  async createPrescription(prescriptionData: {
    appointment_id: number;
    name: string;
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      instructions?: string;
      duration?: string;
    }>;
  }) {
    // Create the prescription
    const { data: prescription, error } = await this.supabase
      .from('prescription')
      .insert({
      
        appointment_id: prescriptionData.appointment_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    if (prescriptionData.medications && prescriptionData.medications.length > 0) {
      const medicationsToInsert = prescriptionData.medications.map(med => ({
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        instructions: med.instructions || null,
        duration: med.duration || null,
        prescription_id: prescription.id
      }));
      
      const { error: medError } = await this.supabase
        .from('medication')
        .insert(medicationsToInsert);
      
      if (medError) throw medError;
    }
    
    return this.findPrescriptionById(prescription.id);
  }

  async updatePrescription(
    id: number,
    prescriptionData: {
      name?: string;
      medications?: Array<{
        id?: number;
        name: string;
        dosage: string;
        frequency: string;
        instructions?: string;
        duration?: string;
      }>;
    }
  ) {
    await this.findPrescriptionById(id);
    
    if (prescriptionData.name) {
      const { error } = await this.supabase
        .from('prescription')
        .update({ name: prescriptionData.name })
        .eq('id', id);
      
      if (error) throw error;
    }
    
    // Update or create medications if provided
    if (prescriptionData.medications && prescriptionData.medications.length > 0) {
      for (const med of prescriptionData.medications) {
        if (med.id) {
          // Update existing medication
          const { error } = await this.supabase
            .from('medication')
            .update({
              name: med.name,
              dosage: med.dosage,
              frequency: med.frequency,
              instructions: med.instructions || null,
              duration: med.duration || null
            })
            .eq('id', med.id)
            .eq('prescription_id', id);
          
          if (error) throw error;
        } else {
          // Create new medication
          const { error } = await this.supabase
            .from('medication')
            .insert({
              name: med.name,
              dosage: med.dosage,
              frequency: med.frequency,
              instructions: med.instructions || null,
              duration: med.duration || null,
              prescription_id: id
            });
          
          if (error) throw error;
        }
      }
    }
    
    // Return the updated prescription
    return this.findPrescriptionById(id);
  }

  async deletePrescription(id: number) {
    // Check if the prescription exists
    await this.findPrescriptionById(id);
    
    // Delete all related medications first
    const { error: medError } = await this.supabase
      .from('medication')
      .delete()
      .eq('prescription_id', id);
    
    if (medError) throw medError;
    
    // Then delete the prescription
    const { error } = await this.supabase
      .from('prescription')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return { deleted: true };
  }

  async deleteMedicationFromPrescription(prescriptionId: number, medicationId: number) {
    // Check if the prescription exists
    await this.findPrescriptionById(prescriptionId);
    
    // Check if medication exists and belongs to the prescription
    const { data: medication, error: findError } = await this.supabase
      .from('medication')
      .select('*')
      .eq('id', medicationId)
      .eq('prescription_id', prescriptionId)
      .single();
    
    if (findError || !medication) {
      throw new NotFoundException(
        `Medication with ID ${medicationId} not found or does not belong to prescription with ID ${prescriptionId}`
      );
    }
    
    // Delete the medication
    const { error } = await this.supabase
      .from('medication')
      .delete()
      .eq('id', medicationId)
      .eq('prescription_id', prescriptionId);
    
    if (error) throw error;
    
    return { deleted: true };
  }

 
  async findPrescriptionById(id: number) {
    // Get prescription with related appointment and patient data
    const { data: prescription, error } = await this.supabase
      .from('prescription')
      .select(`
        *
      `)
      .eq('id', id)
      .single();
    
    if (error || !prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }
    
    // Get medication for this prescription
    const { data: medications, error: medError } = await this.supabase
      .from('medication')
      .select('*')
      .eq('prescription_id', id);
    
    if (medError) throw medError;
    
    // Get detailed patient information using the SQL query
    const { data: patientDetails, error: patientError } = await this.supabase.rpc(
      'get_patient_details_for_prescription',
      { prescription_id: id }
    );

    // If there's an error or no patient details, we'll use fallback values
    const patientInfo = patientError || !patientDetails || patientDetails.length === 0 
      ? null 
      : patientDetails[0];
    
    // Restructure the data to make it easier to work with
    const result = {
      ...prescription,
      patient_name: prescription.appointments?.patients?.name || 'Unknown Patient',
      patient_age: prescription.appointments?.patients?.age,
      diagnosis: prescription.appointments?.diagnosis,
      medications: medications || [],
      // Add new patient details
      patient_first_name: patientInfo?.first_name,
      patient_family_name: patientInfo?.family_name,
      patient_calculated_age: patientInfo?.age
    };
    
    return result;
  }

  async generatePrescriptionPdf(id: number): Promise<Buffer> {
    try {
      // First check if the prescription exists
      const { data: prescriptionExists, error: checkError } = await this.supabase
        .from('prescription')
        .select('id')
        .eq('id', id)
        .single();
      
      if (checkError || !prescriptionExists) {
        console.error(`Prescription with ID ${id} not found in direct check`);
        throw new NotFoundException(`Prescription with ID ${id} not found`);
      }
      
      console.log(`Found prescription ${id}, now getting full details...`);
      
      // Get the prescription with all necessary data
      const prescription = await this.findPrescriptionById(id);
      
      if (!prescription) {
        console.error(`Prescription with ID ${id} found but couldn't get details`);
        throw new NotFoundException(`Could not get details for prescription with ID ${id}`);
      }
      
      console.log(`Successfully retrieved full details for prescription ${id}`);
      
      // Prepare data for PDF generation with better fallbacks
      const pdfData = {
        id: prescription.id,
        patientName: prescription.patient_name || prescription.appointments?.patients?.name || 'Unknown Patient',
        patientAge: prescription.patient_calculated_age || prescription.patient_age || prescription.appointments?.patients?.age || null,
        patientFirstName: prescription.patient_first_name || '',
        patientFamilyName: prescription.patient_family_name || '',
        date: prescription.created_at || new Date(),
        diagnosis: prescription.diagnosis || prescription.appointments?.diagnosis || '',
        instructions: prescription.name || '', // Using name as general instructions
        medications: (prescription.medications || []).map(med => ({
          name: med.name || 'Unnamed medication',
          dosage: med.dosage || 'Not specified',
          frequency: med.frequency || 'Not specified',
          duration: med.duration || '',
          instructions: med.instructions || '',
          specialInstructions: ''  // Add any special instructions if needed
        }))
      };
      
      console.log('Prescription data for PDF:', JSON.stringify(pdfData, null, 2));
      
      // Generate the PDF using the PdfService
      const pdfBuffer = await this.pdfService.generatePrescriptionPdf(pdfData);
      console.log('PDF generated successfully, buffer length:', pdfBuffer.length);
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating prescription PDF:', error);
      throw error;
    }
  }
}