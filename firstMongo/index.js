const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');

const Product = require('./models/product');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

mongoose.connect('mongodb://localhost:27017/farmStand')
    .then(()=>{
        console.log("connection to db is open!");
    })
    .catch((error)=>{
        console.log("something went wrong with db connection");
        console.log(error);
    });

app.get('/products', async(req, res) => {
    const products = await Product.find({});
    console.log(products);
    res.render("products/index", {products});
})

app.get('/products/:id', async(req, res) => {
    const {id} = req.params;
    const foundProduct = await Product.findById(id);
    console.log(foundProduct);
    res.render("products/show", {foundProduct});
})

app.listen('3000', () => {
    console.log("Local server is listening on port 3000!");
})
