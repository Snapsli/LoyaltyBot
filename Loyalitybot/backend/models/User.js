const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    telegramId: { type: String, required: true, unique: true },
    firstName: { type: String },
    lastName: { type: String },
    middleName: { type: String },
    username: { type: String, required: true, unique: true },
    phone: { type: String },
    email: { type: String },
    role: { 
      type: String, 
      enum: ['admin', 'user'],
      default: 'user'
    },
    sessionToken: { type: String },

    // Loyalty program fields
    balance: { type: Number, default: 0 }, // Deprecated - use barPoints instead
    barPoints: {
        type: Map,
        of: Number,
        default: function() {
            return new Map([
                ['1', 0], // Культура
                ['2', 0], // Caballitos Mexican Bar
                ['3', 0], // Fonoteca - Listening Bar
                ['4', 0]  // Tchaikovsky
            ]);
        }
    },
    lastBalanceReset: { type: Date },
    
    // User management
    isBlocked: { type: Boolean, default: false },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

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
    transform: function(doc, ret) {
        // Convert barPoints Map to Object for JSON serialization
        if (ret.barPoints instanceof Map) {
            ret.barPoints = Object.fromEntries(ret.barPoints);
        }
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema); 