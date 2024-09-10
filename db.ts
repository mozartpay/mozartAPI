import mongoose, { ConnectOptions } from 'mongoose';

async function connectToDB() {
  await mongoose
    // .connect('mongodb+srv://MozartPayUser:MozartPayUser@cluster0.zlfsm.mongodb.net/test?authSource=admin&replicaSet=atlas-11penf-shard-0&readPreference=primary&ssl=true', {
      .connect('mongodb+srv://MozartPayUser:MozartPayUser@cluster0.zlfsm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {  
    useNewUrlParser: true,
      useUnifiedTopology: true,
      heartbeatFrequencyMS: 3000,
      serverSelectionTimeoutMS: 30000,
    } as ConnectOptions)
    .then((res) => {
      console.log('Connected to Distribution API Database - Initial Connection');
    })
    .catch((err) => {
      console.log(`Initial Distribution API Database connection error occurred -`, err);
    });
    
}

export default connectToDB;