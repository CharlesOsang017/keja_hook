import Property from "../models/property.model.js"

// Create a property
export const createProperty = async(req, res)=>{
    const {title, description, price, location} = req.body
    let {images} = req.body;
    try {
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