export enum TN3270Orders {
  SF = 0x1d, // Start Field
  SFE = 0x29, // Start Field Extended
  SBA = 0x11, // Set Buffer Address
  SA = 0x28, // Set Attribute
  MF = 0x2c, // Modify Field
  IC = 0x13, // Insert Cursor
  PT = 0x05, // Program Tab
  RA = 0x3c, // Repeat to Address
  EUA = 0x12, // Erase Unprotected to Address
  GE = 0x08, // Graphic Escape
}
