/* eslint-disable prettier/prettier */
export class BitOperationsUtil {
    /**
     * Converts from PostgreSQL bit(48) format to a binary string of '0's and '1's
     * @param pgBitString - The bit string from PostgreSQL (e.g., '101010...')
     * @returns A string of '0's and '1's
     */
    static pgBitToBinaryString(pgBitString: string): string {
      // PostgreSQL returns bit strings like '101010...'
      // We just need to ensure it's 48 bits long
      return pgBitString.padEnd(48, '0').substring(0, 48);
    }
  
    /**
     * Converts a binary string of '0's and '1's to PostgreSQL bit(48) format
     * @param binaryString - A string of '0's and '1's
     * @returns The bit string for PostgreSQL
     */
    static binaryStringToPgBit(binaryString: string): string {
      // Ensure the string is exactly 48 bits
      return binaryString.padEnd(48, '0').substring(0, 48);
    }
  
    /**
     * Creates a bit string with specified slots set to '1' (available)
     * @param slotRanges - Array of ranges where slots should be available
     * @returns A 48-character string of '0's and '1's
     */
    static createAvailableBits(slotRanges: { startSlot: number, endSlot: number }[]): string {
      // Start with all slots unavailable
      let bits = '0'.repeat(48);
      
      // Set the specified ranges to available ('1')
      for (const range of slotRanges) {
        for (let i = range.startSlot; i <= range.endSlot; i++) {
          if (i >= 0 && i < 48) {
            bits = bits.substring(0, i) + '1' + bits.substring(i + 1);
          }
        }
      }
      
      return bits;
    }
  
    /**
     * Checks if a specific slot is available in the bit string
     * @param bitString - The 48-bit string ('0's and '1's)
     * @param slotPosition - The position to check (0-47)
     * @returns true if the slot is available, false otherwise
     */
    static isSlotAvailable(bitString: string, slotPosition: number): boolean {
      if (slotPosition < 0 || slotPosition >= 48) {
        return false;
      }
      return bitString[slotPosition] === '1';
    }
  
    /**
     * Marks a slot as unavailable in the bit string
     * @param bitString - The original 48-bit string
     * @param slotPosition - The position to mark as unavailable (0-47)
     * @returns The updated bit string
     */
    static markSlotAsUnavailable(bitString: string, slotPosition: number): string {
      if (slotPosition < 0 || slotPosition >= 48) {
        return bitString;
      }
      console.log("debug")
      console.log(bitString.substring(0, slotPosition))
      console.log(bitString.substring(slotPosition + 1))

      return bitString.substring(0, slotPosition) + '0' + bitString.substring(slotPosition, 48);
    }
  
    /**
     * Gets all available slot positions from a bit string
     * @param bitString - The 48-bit string
     * @returns Array of available slot positions (0-47)
     */
    static getAvailableSlots(bitString: string): number[] {
      const availableSlots: number[] = [];
      
      for (let i = 0; i < bitString.length; i++) {
        if (bitString[i] === '1') {
          availableSlots.push(i);
        }
      }
      
      return availableSlots;
    }
  
    /**
     * Converts a slot position (0-47) to a time string
     * @param slotPosition - Slot position (0-47)
     * @returns Formatted time string (e.g., "08:00 AM")
     */
    static slotToTimeString(slotPosition: number): string {
      const hour = Math.floor(slotPosition / 2);
      const minute = (slotPosition % 2) * 30;
      
      // Format hour as 12-hour with AM/PM
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
      
      // Format time as HH:MM AM/PM
      return `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
    }
  
    /**
     * Converts a time to a slot position
     * @param hour - Hour (0-23)
     * @param minute - Minute (0-59)
     * @returns Slot position (0-47)
     */
    static timeToSlot(hour: number, minute: number): number {
      return hour * 2 + (minute >= 30 ? 1 : 0);
    }
  }
  