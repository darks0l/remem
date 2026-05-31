declare const schema: {
  $schema: string;
  $id: string;
  title: string;
  type: string;
  additionalProperties: boolean;
  [key: string]: unknown;
};

export default schema;
