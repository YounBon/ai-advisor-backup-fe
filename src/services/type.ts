// eslint-disable-next-line @typescript-eslint/no-explicit-any -- default generic for untyped API payloads
export type ApiResponse<DataType = any> = {
  message: string
  data: DataType
}
