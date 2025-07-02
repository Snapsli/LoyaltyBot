require('dotenv').config();
const mongoose = require('mongoose');
const Bar = require('./models/Bar');

const defaultBars = [
  {
    barId: 1,
    name: "Культура",
    address: "Ульяновск, Ленина, 15",
    image: "/images/bars/kultura.jpg",
    description: "Уютное место с атмосферой искусства и культуры. Здесь современные тренды сочетаются с традиционными европейскими стандартами."
  },
  {
    barId: 2,
    name: "Caballitos Mexican Bar",
    address: "Ульяновск, Дворцовая, 8",
    image: "/images/bars/cabalitos.jpg",
    description: "Аутентичный мексиканский бар с традиционными коктейлями и зажигательной атмосферой Латинской Америки."
  },
  {
    barId: 3,
    name: "Fonoteca - Listening Bar",
    address: "Ульяновск, Карла Маркса, 20",
    image: "/images/bars/fonoteka.jpg",
    description: "Музыкальный бар для истинных меломанов. Качественный звук, винтажные пластинки и уютная атмосфера для наслаждения музыкой."
  },
  {
    barId: 4,
    name: "Tchaikovsky",
    address: "Ульяновск, Советская, 25",
    image: "/images/bars/tchaykovsky.jpg",
    description: "Классический бар с изысканной атмосферой. Здесь подают благородные напитки в элегантной обстановке."
  }
];

async function initBars() {
  try {
    // Подключаемся к MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Проверяем, есть ли уже бары в базе
    const existingBars = await Bar.find({});
    
    if (existingBars.length > 0) {
      console.log('Bars already exist in database:', existingBars.length);
      return;
    }

    // Создаем базовые бары
    for (const barData of defaultBars) {
      const existingBar = await Bar.findOne({ barId: barData.barId });
      
      if (!existingBar) {
        const bar = new Bar(barData);
        await bar.save();
        console.log(`Created bar: ${bar.name}`);
      } else {
        console.log(`Bar already exists: ${existingBar.name}`);
      }
    }

    console.log('✅ Bars initialization completed');
  } catch (error) {
    console.error('❌ Error initializing bars:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Запускаем инициализацию
initBars(); 