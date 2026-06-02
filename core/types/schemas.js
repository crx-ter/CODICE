// ═════════════════════════════════════════════════════════════════════════════
// CÓDICE - core/types/schemas.js
// Type Validation: Schemas para validación de datos
// ═════════════════════════════════════════════════════════════════════════════

// Schema validator simple (similar a Zod pero básico)
class Schema {
  constructor(validator) {
    this.validator = validator;
  }

  parse(data) {
    const result = this.validator(data);
    if (result.error) {
      throw new Error(`Validation error: ${result.error}`);
    }
    return result.data;
  }

  safeParse(data) {
    try {
      return {
        success: true,
        data: this.parse(data),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Funciones de validación base
const validators = {
  string: (value) => {
    if (typeof value !== 'string') {
      return { error: 'Expected string' };
    }
    return { data: value };
  },

  number: (value) => {
    if (typeof value !== 'number') {
      return { error: 'Expected number' };
    }
    return { data: value };
  },

  boolean: (value) => {
    if (typeof value !== 'boolean') {
      return { error: 'Expected boolean' };
    }
    return { data: value };
  },

  object: (shape) => (value) => {
    if (typeof value !== 'object' || value === null) {
      return { error: 'Expected object' };
    }
    
    const result = {};
    for (const key in shape) {
      const fieldValidator = shape[key];
      const validation = fieldValidator(value[key]);
      if (validation.error) {
        return { error: `Field ${key}: ${validation.error}` };
      }
      result[key] = validation.data;
    }
    
    return { data: result };
  },

  array: (itemSchema) => (value) => {
    if (!Array.isArray(value)) {
      return { error: 'Expected array' };
    }
    
    const result = [];
    for (const item of value) {
      const validation = itemSchema(item);
      if (validation.error) {
        return { error: validation.error };
      }
      result.push(validation.data);
    }
    
    return { data: result };
  },

  optional: (schema) => (value) => {
    if (value === undefined || value === null) {
      return { data: value };
    }
    return schema(value);
  },

  default: (defaultValue, schema) => (value) => {
    if (value === undefined || value === null) {
      return { data: defaultValue };
    }
    return schema(value);
  },

  enum: (values) => (value) => {
    if (!values.includes(value)) {
      return { error: `Expected one of: ${values.join(', ')}` };
    }
    return { data: value };
  },

  min: (schema, min) => (value) => {
    const result = schema(value);
    if (result.error) return result;
    
    if (typeof value === 'string' && value.length < min) {
      return { error: `String must be at least ${min} characters` };
    }
    if (typeof value === 'number' && value < min) {
      return { error: `Number must be at least ${min}` };
    }
    
    return result;
  },

  max: (schema, max) => (value) => {
    const result = schema(value);
    if (result.error) return result;
    
    if (typeof value === 'string' && value.length > max) {
      return { error: `String must be at most ${max} characters` };
    }
    if (typeof value === 'number' && value > max) {
      return { error: `Number must be at most ${max}` };
    }
    
    return result;
  },
};

// Schemas de dominio
const BlockSchema = new Schema(
  validators.object({
    id: validators.string,
    title: validators.string,
    type: validators.enum(['text', 'code', 'quiz', 'diagram', 'image', 'list']),
    content: validators.string,
    position: validators.number,
    createdAt: validators.string,
    updatedAt: validators.string,
  })
);

const ClassSchema = new Schema(
  validators.object({
    id: validators.string,
    title: validators.string,
    blocks: validators.array(b => BlockSchema.safeParse(b)?.data || b),
    createdAt: validators.string,
    updatedAt: validators.string,
  })
);

const ModuleSchema = new Schema(
  validators.object({
    id: validators.string,
    title: validators.string,
    description: validators.optional(validators.string),
    classes: validators.array(c => ClassSchema.safeParse(c)?.data || c),
    createdAt: validators.string,
    updatedAt: validators.string,
  })
);

const HistoryItemSchema = new Schema(
  validators.object({
    timestamp: validators.string,
    message: validators.string,
    response: validators.string,
    moduleId: validators.optional(validators.string),
    classId: validators.optional(validators.string),
  })
);

const SettingsSchema = new Schema(
  validators.object({
    theme: validators.enum(['dark', 'light']),
    language: validators.enum(['es', 'en']),
    fontSize: validators.number,
    highContrast: validators.boolean,
    fontScale: validators.enum(['normal', 'lg', 'xl']),
    autoSave: validators.boolean,
    aiModel: validators.string,
  })
);

const AppStateSchema = new Schema(
  validators.object({
    modules: validators.array(m => ModuleSchema.safeParse(m)?.data || m),
    currentModuleId: validators.optional(validators.string),
    currentClassId: validators.optional(validators.string),
    currentBlockId: validators.optional(validators.string),
    history: validators.array(h => HistoryItemSchema.safeParse(h)?.data || h),
    settings: validators.object({
      theme: validators.enum(['dark', 'light']),
      language: validators.enum(['es', 'en']),
      fontSize: validators.number,
      highContrast: validators.boolean,
      fontScale: validators.enum(['normal', 'lg', 'xl']),
      autoSave: validators.boolean,
      aiModel: validators.string,
    }),
  })
);

// Exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Schema,
    validators,
    BlockSchema,
    ClassSchema,
    ModuleSchema,
    HistoryItemSchema,
    SettingsSchema,
    AppStateSchema,
  };
}
