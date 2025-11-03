/**
 * AssemblyScript Type Declarations for IDE Support
 *
 * These type declarations help IDEs understand AssemblyScript-specific types
 * that exist at runtime but are not recognized by standard TypeScript.
 *
 * NOTE: These declarations are ONLY for IDE/editor support.
 * The actual compilation uses @graphprotocol/graph-cli which understands these types natively.
 */

// ============================================================================
// AssemblyScript Integer Types
// ============================================================================

/**
 * 8-bit signed integer
 */
declare type i8 = number;

/**
 * 16-bit signed integer
 */
declare type i16 = number;

/**
 * 32-bit signed integer (most commonly used)
 */
declare type i32 = number;

/**
 * 64-bit signed integer
 */
declare type i64 = number;

/**
 * 8-bit unsigned integer
 */
declare type u8 = number;

/**
 * 16-bit unsigned integer
 */
declare type u16 = number;

/**
 * 32-bit unsigned integer
 */
declare type u32 = number;

/**
 * 64-bit unsigned integer
 */
declare type u64 = number;

/**
 * 32-bit floating point
 */
declare type f32 = number;

/**
 * 64-bit floating point
 */
declare type f64 = number;

/**
 * Pointer-sized signed integer
 */
declare type isize = number;

/**
 * Pointer-sized unsigned integer
 */
declare type usize = number;

// ============================================================================
// String Extensions (from @graphprotocol/graph-ts)
// ============================================================================

declare global {
  interface String {
    /**
     * Converts string to lowercase
     */
    toLowerCase(): string;

    /**
     * Converts string to uppercase
     */
    toUpperCase(): string;

    /**
     * Concatenates strings
     */
    concat(other: string): string;

    /**
     * Returns substring
     */
    slice(start: number, end?: number): string;

    /**
     * Finds index of substring
     */
    indexOf(searchString: string, position?: number): number;

    /**
     * Finds last index of substring
     */
    lastIndexOf(searchString: string, position?: number): number;

    /**
     * Checks if string contains substring
     */
    includes(searchString: string, position?: number): boolean;

    /**
     * Checks if string starts with substring
     */
    startsWith(searchString: string, position?: number): boolean;

    /**
     * Checks if string ends with substring
     */
    endsWith(searchString: string, length?: number): boolean;

    /**
     * Repeats string n times
     */
    repeat(count: number): string;

    /**
     * Pads string at start
     */
    padStart(targetLength: number, padString?: string): string;

    /**
     * Pads string at end
     */
    padEnd(targetLength: number, padString?: string): string;

    /**
     * Trims whitespace
     */
    trim(): string;

    /**
     * Trims whitespace from start
     */
    trimStart(): string;

    /**
     * Trims whitespace from end
     */
    trimEnd(): string;

    /**
     * Splits string into array
     */
    split(separator: string, limit?: number): string[];

    /**
     * Replaces first occurrence
     */
    replace(searchValue: string, replaceValue: string): string;

    /**
     * Replaces all occurrences
     */
    replaceAll(searchValue: string, replaceValue: string): string;

    /**
     * Gets character at index
     */
    charAt(index: number): string;

    /**
     * Gets character code at index
     */
    charCodeAt(index: number): number;
  }
}

// ============================================================================
// Ethereum Transaction Extensions (for networkAnalytics.ts)
// ============================================================================

/**
 * Extended Transaction interface with additional properties
 * that are available in graph-ts but not in standard TypeScript
 */
declare module "@graphprotocol/graph-ts" {
  export namespace ethereum {
    interface Transaction {
      /**
       * Block information (available via event.block in handlers)
       * Note: Access via event.block, not transaction.block
       */
      readonly block?: {
        readonly number: BigInt;
        readonly timestamp: BigInt;
        readonly hash: Bytes;
      };

      /**
       * Gas used by transaction
       * Note: Access via event.receipt.gasUsed in handlers
       */
      readonly gasUsed?: BigInt;
    }
  }
}

export {};
