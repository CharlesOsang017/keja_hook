import Property from "../models/property.model.js"
import User from "../models/user.model.js";

// Create a property
export const createProperty = async(req, res)=>{
    const {title, description, price, location} = req.body
    let {images} = req.body;
    const userId = req.user._id

    try {
        const user = await User.findById(userId)
        if(!title || !description || !price || !location){
            return res.status(403).json({message: "All fields are required"})
        }
        const property = new Property({
            title,
            description,
            price,
            location,
            images,
            owner: req.user._id
        })
        await property.save()
        return res.status(201).json(property)
    } catch (error) {
        console.log(error.message)
    }

}