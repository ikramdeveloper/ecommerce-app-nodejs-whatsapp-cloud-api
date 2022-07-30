const axios = require("axios");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const fetchAssistant = async (endpoint) => {
  try {
    const response = await axios.get(
      `https://fakestoreapi.com${endpoint ? endpoint : "/"}`
    );
    if (response.data.error) {
      throw Error(response.error);
    }

    return { status: "success", data: response.data };
  } catch (err) {
    console.log("error", err);
  }
};

const getProductById = async (productId) => {
  return await fetchAssistant(`/products/${productId}`);
};

const getAllCategories = async () => {
  return await fetchAssistant("/products/categories?limit=100");
};

const getProductsInCategory = async (categoryId) => {
  return await fetchAssistant(`/products/category/${categoryId}?limit=10`);
};

const generatePdfInvoice = ({ order_details, file_path }) => {
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(file_path));
  doc.fontSize(25);
  doc.text(order_details, 100, 100);
  doc.end();
  return;
};

const generateRandomGeoLocation = () => {
  const storeLocations = [
    {
      latitude: 44.985613,
      longitude: 20.1568773,
      address: "New Castle",
    },
    {
      latitude: 36.929749,
      longitude: 98.480195,
      address: "Glacier Hill",
    },
    {
      latitude: 28.91667,
      longitude: 30.85,
      address: "Buena Vista",
    },
  ];
  return storeLocations[Math.floor(Math.random() * storeLocations.length)];
};

module.exports = {
  getProductById,
  getAllCategories,
  getProductsInCategory,
  generatePdfInvoice,
  generateRandomGeoLocation,
};
