
const Joi = require('joi');

describe('Validation Schema Tests', () => {
  const reservationSchema = Joi.object({
    partnerId: Joi.string().min(1).max(100).required(),
    seats: Joi.number().integer().min(1).max(10).required()
  });

  test('Should accept valid reservation data', () => {
    const validData = {
      partnerId: 'abc-corp',
      seats: 5
    };
    
    const { error } = reservationSchema.validate(validData);
    expect(error).toBeUndefined();
  });

  test('Should reject seats less than 1', () => {
    const invalidData = {
      partnerId: 'abc-corp',
      seats: 0
    };
    
    const { error } = reservationSchema.validate(invalidData);
    expect(error).toBeDefined();
  });

  test('Should reject seats greater than 10', () => {
    const invalidData = {
      partnerId: 'abc-corp',
      seats: 15
    };
    
    const { error } = reservationSchema.validate(invalidData);
    expect(error).toBeDefined();
  });

  test('Should reject missing partnerId', () => {
    const invalidData = {
      seats: 5
    };
    
    const { error } = reservationSchema.validate(invalidData);
    expect(error).toBeDefined();
  });

  test('Should reject empty partnerId', () => {
    const invalidData = {
      partnerId: '',
      seats: 5
    };
    
    const { error } = reservationSchema.validate(invalidData);
    expect(error).toBeDefined();
  });
});
