import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { PrescriptionDto, MedicationResponseDto } from './dto/prescription.dto';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  
  async create(createPrescriptionDto: CreatePrescriptionDto): Promise<PrescriptionDto> {
    const client = this.supabaseService.getClient();
    const now = new Date().toISOString();
    
    try {
      // Create prescription with all required fields
      const { data: prescription, error: prescriptionError } = await client
        .from('prescriptions')
        .insert({
          patient_id: createPrescriptionDto.patientId,
          doctor_id: createPrescriptionDto.doctorId,
          created_at: now,
          diagnosis: createPrescriptionDto.diagnosis || null,
          instructions: createPrescriptionDto.instructions || null
        })
        .select()
        .single();
  
      if (prescriptionError) throw prescriptionError;
  
      // Create medications
      if (createPrescriptionDto.medications?.length > 0) {
        for (const med of createPrescriptionDto.medications) {
          try {
            // Enhanced medication data with all possible fields
            const medicationData = {
              prescription_id: prescription.id,
              name: med.name,
              dosage: med.dosage,
              frequency: med.frequency,
              duration: med.duration,
              special_instructions: med.specialInstructions || null,
            };
  
            console.log('Full medication data being inserted:', medicationData);
  
            // Test connection with simple query first
            const { error: testError } = await client
              .from('medications')
              .select('id')
              .limit(1);
            
            if (testError) {
              throw new Error(`Test query failed: ${JSON.stringify(testError)}`);
            }
  
            // Attempt the insert
            const { data: insertedMed, error: insertError } = await client
              .from('medications')
              .insert(medicationData)
              .select()
              .single();
  
            if (insertError) {
              console.error('Raw insert error object:', insertError);
              throw new Error(`Medication insert failed: ${JSON.stringify({
                message: insertError.message,
                details: insertError.details,
                code: insertError.code,
                hint: insertError.hint,
                stack: new Error().stack
              })}`);
            }
  
            console.log('Successfully inserted medication:', insertedMed);
          } catch (medError) {
            await client.from('prescriptions').delete().eq('id', prescription.id);
            console.error('Medication creation failed:', {
              medication: med,
              error: medError instanceof Error ? medError.message : medError,
              fullError: medError
            });
            throw new Error(`Failed to create medication ${med.name}. ${medError instanceof Error ? medError.message : 'Unknown error'}`);
          }
        }
      }
  
      return this.findOne(prescription.id);
    } catch (error) {
      console.error('Prescription creation process failed:', {
        error: error instanceof Error ? error.message : error,
        fullError: error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
    

  async findByDoctor(doctorId: number): Promise<PrescriptionDto[]> {
    const client = this.supabaseService.getClient();
    
    const { data: prescriptions, error } = await client
      .from('prescriptions')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch prescriptions: ${error.message}`);
    }

    return await Promise.all(
      prescriptions.map(prescription => this.mapToPrescriptionDto(prescription))
    );
  }

  async findByPatient(patientId: number): Promise<PrescriptionDto[]> {
    const client = this.supabaseService.getClient();
    
    const { data: prescriptions, error } = await client
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch prescriptions: ${error.message}`);
    }

    return await Promise.all(
      prescriptions.map(prescription => this.mapToPrescriptionDto(prescription))
    );
  }

  async findOne(id: number): Promise<PrescriptionDto> {
    const client = this.supabaseService.getClient();
    
    const { data: prescription, error } = await client
      .from('prescriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !prescription) {
      throw new NotFoundException(`Prescription with ID ${id} not found`);
    }

    return this.mapToPrescriptionDto(prescription);
  }

  private async mapToPrescriptionDto(prescription: any): Promise<PrescriptionDto> {
    const client = this.supabaseService.getClient();
    
    try {
      // First check if the prescription_medications table exists and has entries for this prescription
      const { data: prescriptionMedications, error: relError } = await client
        .from('prescription_medications')
        .select('medication_id, dosage, frequency, duration, special_instructions')
        .eq('prescription_id', prescription.id);
      
      let medicationDtos: MedicationResponseDto[] = [];
      
      if (!relError && prescriptionMedications && prescriptionMedications.length > 0) {
        // If using the relation table, fetch medication details and combine with prescription-specific info
        for (const prescMed of prescriptionMedications) {
          const { data: medication, error: medError } = await client
            .from('medications')
            .select('id, name')
            .eq('id', prescMed.medication_id)
            .single();
            
          if (medError) {
            console.error(`Failed to fetch medication with ID ${prescMed.medication_id}:`, medError);
            continue;
          }
          
          medicationDtos.push({
            id: medication.id,
            name: medication.name,
            dosage: prescMed.dosage,
            frequency: prescMed.frequency,
            duration: prescMed.duration,
            specialInstructions: prescMed.special_instructions,
          });
        }
      } else {
        // Fallback to the original approach if no relations found
        const { data: medications, error } = await client
          .from('medications')
          .select('*')
          .eq('prescription_id', prescription.id);
  
        if (error) {
          throw new Error(`Failed to fetch medications: ${error.message}`);
        }
  
        medicationDtos = medications.map(medication => ({
          id: medication.id,
          name: medication.name,
          dosage: medication.dosage,
          frequency: medication.frequency,
          duration: medication.duration,
          specialInstructions: medication.special_instructions,
        }));
      }
  
      // Ensure createdAt is properly handled - check if it's valid before converting
      let createdAtDate: Date;
      try {
        createdAtDate = prescription.created_at ? new Date(prescription.created_at) : new Date();
        // Check if date is valid (not the epoch default)
        if (createdAtDate.getFullYear() === 1970) {
          createdAtDate = new Date(); // Use current date as fallback
        }
      } catch (e) {
        console.error('Error parsing date:', e);
        createdAtDate = new Date();
      }
  
      // Add debugging logs for the prescription data
      console.log('Raw prescription data from database:', prescription);
  
      return {
        id: prescription.id,
        patientId: prescription.patient_id,
        doctorId: prescription.doctor_id,
        createdAt: createdAtDate,
        diagnosis: prescription.diagnosis,
        instructions: prescription.instructions,
        medications: medicationDtos,
      };
    } catch (error) {
      console.error('Error mapping prescription to DTO:', error);
      // Fallback to basic prescription data if medication fetching fails
      return {
        id: prescription.id,
        patientId: prescription.patient_id,
        doctorId: prescription.doctor_id,
        createdAt: new Date(prescription.created_at) || new Date(),
        diagnosis: prescription.diagnosis,
        instructions: prescription.instructions,
        medications: [],
      };
    }
  }
}