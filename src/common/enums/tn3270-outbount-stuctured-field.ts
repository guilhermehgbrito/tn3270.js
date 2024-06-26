export enum TN3270OutboundStructuredFields {
  ACTIVATE_PARTITION = 0x0e,
  CREATE_PARTITION = 0x0c,
  DESTROY_PARTITION = 0x0d,
  ERASE_RESET = 0x03,
  READ_PARTITION = 0x01,
  QUERY = 0x02,
  QUERY_LIST = 0x03,
  READ_MODIFIED_ALL = 0x6e,
  READ_BUFFER = 0xf2,
  READ_MODIFIED = 0xf6,
  RESET_PARTITION = 0x00,
}
