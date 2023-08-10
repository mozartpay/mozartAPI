import express, { Express, Request, Response } from "express";
import { User } from '../models/user'; 
const router = express.Router();

router.get('/:email', async (req: Request, res: Response) => {
  try {
    const email = req.params.email;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Extract the desired user information
    const userInfo = user ;

    res.status(200).json(userInfo);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
router.post('/image', async (req: Request, res: Response) => {
    res.header("Access-Control-Allow-Origin", '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    res.header('Content-Type', 'application/json');

    const { email, image } = req.body;
    console.log('email',email)
    console.log('image',image)
    try {
      const user = await User.findOneAndUpdate({ email }, { image }, { new: true });
      console.log('try')
      if (!user) {
        console.log('User not found')
        return res.status(404).json({ message: 'User not found' });
        
      }
  
      console.log('User image updated:', user);
      return res.status(200).json({ message: 'User image updated successfully', user });
    } catch (error) {
      console.error('Error updating user image:', error);
      return res.status(500).json({ message: 'User image update failed' });
    }
  });

  export default router;