const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    // Основная информация
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    barId: { 
        type: String, 
        required: true 
    },
    
    // Тип операции
    type: {
        type: String,
        enum: ['spend', 'earn', 'admin_add', 'admin_remove'],
        required: true
    },
    
    // Для операций накопления
    purchaseAmount: { 
        type: Number 
    }, // Сумма покупки в рублях
    
    // Для операций списания
    itemId: {
        type: Schema.Types.ObjectId,
        ref: 'MenuItem'
    },
    itemName: { 
        type: String 
    }, // Название товара/услуги
    
    // Количество баллов (положительное для накопления, отрицательное для списания)
    points: {
        type: Number,
        required: true
    },
    
    // QR код информация
    qrData: { 
        type: String 
    }, // Данные QR кода
    
    // Баланс до и после операции
    balanceBefore: { 
        type: Number, 
        required: true 
    },
    balanceAfter: { 
        type: Number, 
        required: true 
    },
    
    // Метаданные
    description: { 
        type: String 
    }, // Описание операции
    adminId: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
    }, // ID администратора (для админских операций)
    
    // Временные метки
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    expiresAt: { 
        type: Date 
    } // Для QR кодов
    
}, {
    timestamps: true
});

// Индексы для быстрого поиска
transactionSchema.index({ userId: 1, barId: 1, createdAt: -1 });
transactionSchema.index({ barId: 1, type: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });

// Виртуальные поля
transactionSchema.virtual('isEarn').get(function() {
    return this.type === 'earn' || this.type === 'admin_add';
});

transactionSchema.virtual('isSpend').get(function() {
    return this.type === 'spend' || this.type === 'admin_remove';
});

transactionSchema.virtual('absoluteAmount').get(function() {
    return Math.abs(this.points);
});

// Методы
transactionSchema.methods.getFormattedDescription = function() {
    switch (this.type) {
        case 'earn':
            return `Начислено ${this.points} баллов за покупку на ${this.purchaseAmount}₽`;
        case 'spend':
            return `Списано ${Math.abs(this.points)} баллов за ${this.itemName}`;
        case 'admin_add':
            return `Администратор добавил ${this.points} баллов`;
        case 'admin_remove':
            return `Администратор убрал ${Math.abs(this.points)} баллов`;
        default:
            return this.description || 'Операция с баллами';
    }
};

// Статические методы для статистики
transactionSchema.statics.getBarStats = async function(barId, startDate = null, endDate = null) {
    const matchStage = { barId };
    
    if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalAmount: { $sum: '$points' },
                totalPurchaseAmount: { $sum: { $ifNull: ['$purchaseAmount', 0] } },
                uniqueUsers: { $addToSet: '$userId' }
            }
        }
    ]);
    
    // Форматируем результат
    const result = {
        totalTransactions: 0,
        totalEarned: 0,
        totalSpent: 0,
        totalPurchaseAmount: 0,
        uniqueUsers: 0,
        byType: {}
    };
    
    const allUserIds = new Set();
    
    stats.forEach(stat => {
        result.totalTransactions += stat.count;
        result.totalPurchaseAmount += stat.totalPurchaseAmount;
        stat.uniqueUsers.forEach(id => allUserIds.add(id.toString()));
        
        if (stat._id === 'earn' || stat._id === 'admin_add') {
            result.totalEarned += stat.totalAmount;
        } else {
            result.totalSpent += Math.abs(stat.totalAmount);
        }
        
        result.byType[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount,
            totalPurchaseAmount: stat.totalPurchaseAmount
        };
    });
    
    result.uniqueUsers = allUserIds.size;
    
    return result;
};

transactionSchema.statics.getUserStats = async function(userId, barId = null) {
    const matchStage = { userId: new mongoose.Types.ObjectId(userId) };
    if (barId) matchStage.barId = barId;
    
    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$barId',
                totalEarned: { $sum: { $cond: [{ $in: ['$type', ['earn', 'admin_add']] }, '$points', 0] } },
                totalSpent: { $sum: { $cond: [{ $in: ['$type', ['spend', 'admin_remove']] }, { $abs: '$points' }, 0] } },
                totalTransactions: { $sum: 1 },
                lastTransaction: { $max: '$createdAt' }
            }
        }
    ]);
    
    return stats;
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 