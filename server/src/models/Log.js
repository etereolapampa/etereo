import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // create | update | delete | move | adjust | restore | login | password-change
    entity: { type: String, required: true }, // category | product | seller | locality | movement | user | stock | other
    entityId: { type: String },
    user: {
      id: String,
      username: String,
      name: String,
      lastname: String,
      admin: Boolean
    },
    ip: { type: String },
    data: { type: mongoose.Schema.Types.Mixed }, // detalles (redactado)
  },
  { timestamps: true }
);

LogSchema.index({ createdAt: -1 });

export default mongoose.model('Log', LogSchema, 'logs');
