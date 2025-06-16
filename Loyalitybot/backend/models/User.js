const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: { type: String, required: true, unique: true },
    firstName: { type: String },
    lastName: { type: String },
    middleName: { type: String },
    username: { type: String, required: true, unique: true},
    phone: { type: String },
    email: { type: String },
    role: { 
      type: String, 
      enum: ['admin', 'user', 'owner', 'customer'],
      default: 'user'
    },
    sessionToken: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
})

// Update `updatedAt' only if something has changed
userSchema.pre("save", function (next) {
    if (this.isModified()) {
        this.updatedAt = Date.now();
    }
    next();
});

// Auto-updating of `updatedAt` at `findOneAndUpdate`
userSchema.pre("findOneAndUpdate", function (next) {
    this.set({ updatedAt: Date.now() });
    next();
});

userSchema.virtual("id").get(function () {
    return this._id.toString();
});

// Ensure virtuals are included when converting documents to JSON
userSchema.set("toJSON", {
    virtuals: true,
});

module.exports = mongoose.model('User', userSchema);