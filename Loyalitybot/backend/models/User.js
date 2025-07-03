const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Telegram fields (optional for admin users)
    telegramId: { type: String, sparse: true, unique: true },
    firstName: { type: String },
    lastName: { type: String },
    middleName: { type: String },
    username: { type: String, sparse: true, unique: true },
    phone: { type: String },
    
    // Classic auth fields
    email: { type: String, sparse: true, unique: true },
    password: { type: String }, // Hashed password for classic auth
    
    // Auth type
    authType: {
        type: String,
        enum: ['telegram', 'classic'],
        default: 'telegram'
    },
    
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

// Auto-updating of `updatedAt` at `findOneAndUpdate`
userSchema.pre("findOneAndUpdate", function (next) {
    this.set({ updatedAt: Date.now() });
    next();
});

userSchema.virtual("id").get(function () {
    return this._id.toString();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (this.isModified()) {
        this.updatedAt = Date.now();
    }
    
    // Hash password if it's modified and not empty
    if (this.isModified('password') && this.password) {
        this.password = await bcryptjs.hash(this.password, 12);
    }
    
    next();
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return bcryptjs.compare(candidatePassword, this.password);
};

// Ensure virtuals are included when converting documents to JSON
userSchema.set("toJSON", {
    virtuals: true,
    transform: function(doc, ret) {
        // Convert barPoints Map to Object for JSON serialization
        if (ret.barPoints instanceof Map) {
            ret.barPoints = Object.fromEntries(ret.barPoints);
        }
        // Don't include password in JSON responses
        delete ret.password;
        return ret;
    }
});

module.exports = mongoose.model('User', userSchema); 