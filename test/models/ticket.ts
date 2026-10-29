import enumValues from '../../src/index';
import mongoose from 'mongoose';
const { Schema } = mongoose;
const TicketSchema = new Schema({
  status: { type: String, enum: ['open', 'closed'] },
  priority: { type: String, enum: ['low', 'high'] },
});

const enumOptions: enumValues.EnumValueOptions = {
  attach: {
    properties: {
      status: { as: 'statuses', on: ['find'] },
      priority: { as: 'priorities', on: ['findOne'] },
    },
  },
};

TicketSchema.plugin(enumValues, enumOptions);

export default mongoose.model('Ticket', TicketSchema);
