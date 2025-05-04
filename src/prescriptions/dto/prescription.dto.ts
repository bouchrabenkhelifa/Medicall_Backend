export class MedicationResponseDto {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  specialInstructions?: string;
}

export class PrescriptionDto {
  id: number;
  patientId: number;
  doctorId: number; // Changed from string to number
  createdAt: Date;
  medications: MedicationResponseDto[];
  instructions?: string;
  diagnosis?: string;
}