const mongoose = require('mongoose');
const Product = require('./models/product');

mongoose.connect('mongodb://localhost:27017/farmStand')
    .then(()=>{
        console.log("connection to db is open!");
    })
    .catch((error)=>{
        console.log("something went wrong with db connection");
        console.log(error);
    });

const productArr = [
    {
        name: "Seedless Grape",
        price: 2.99,
        category: "fruit"
    },
    {
        name: "Snow white Apple",
        price: 199.99,
        category: "fruit"
    },
    {
        name: "Eggy",
        price: 0.7,
        category: "meat"
    },
    {
        name: "Onion",
        price: 0.3,
        category: "vegetable"
    },
    {
        name: "Milky milk",
        price: 1,
        category: "dairy"
    },
]

// const p = new Product({
//     name: "Seedless Grape",
//     price: 2.99,
//     category: "fruit"
// })

Product.insertMany(productArr)
    .then((p)=>{
        console.log(p);
    })
    .catch((err)=>{
        console.log(err);
    })