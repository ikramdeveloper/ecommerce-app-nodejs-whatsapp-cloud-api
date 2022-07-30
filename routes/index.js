const router = require("express").Router();
const WhatsAppCloudApi = require("whatsappcloudapi_wrapper");

const WhatsApp = new WhatsAppCloudApi({
  accessToken: process.env.Meta_WA_accessToken,
  senderPhoneNumberId: process.env.Meta_WA_SenderPhoneNumberId,
  WABA_ID: process.env.Meta_WA_wabaId,
});

const store = require("../utils/ecommerce_store");
const CustomerSession = new Map();

router.get("/meta_wa_callbackurl", (req, res) => {
  try {
    console.log("GET: I am in get meta wa");

    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (
      mode &&
      token &&
      mode === "subscribe" &&
      process.env.Meta_WA_VerifyToken === token
    ) {
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  } catch (err) {
    console.log("error", err);
    return res.sendStatus(500);
  }
});

router.post("/meta_wa_callbackurl", async (req, res) => {
  try {
    console.log("POST: someone is posting");
    const data = WhatsApp.parseMessage(req.body);

    if (data?.isMessage) {
      let incomingMessage = data.message;
      const {
        from: { phone: recipientPhone, name },
        type,
        message_id,
      } = incomingMessage;

      await WhatsApp.markMessageAsRead({ message_id });

      // Start of cart login
      if (!CustomerSession.get(recipientPhone)) {
        CustomerSession.set(recipientPhone, {
          cart: [],
        });
      }

      const addToCart = async ({ productId, recipientPhone }) => {
        const product = await store.getProductById(productId);
        if (product.status === "success") {
          CustomerSession.get(recipientPhone).cart.push(product.data);
        }
      };

      const listOfItemsInCart = ({ recipientPhone }) => {
        let total = 0;
        const products = CustomerSession.get(recipientPhone).cart;
        total = products.reduce((acc, product) => acc + product.price, total);
        let count = products.length;
        return { count, total, products };
      };

      const clearCart = ({ recipientPhone }) => {
        CustomerSession.get(recipientPhone).cart = [];
      };

      // checking type of message

      if (type === "text_message") {
        await WhatsApp.sendSimpleButtons({
          message: `Hey ${name}, \nYou are speaking to a chatbot. \nWhat do you want to do next?`,
          recipientPhone,
          listOfButtons: [
            {
              title: "View some products",
              id: "see_categories",
            },
            {
              title: "Speak to a human",
              id: "speak_to_human",
            },
          ],
        });
      }

      if (type === "simple_button_message") {
        let button_id = incomingMessage.button_reply.id;

        if (button_id.startsWith("add_to_cart_")) {
          const productId = button_id.split("add_to_cart_")[1];
          await addToCart({ productId, recipientPhone });
          const numberOfItemsInCart = listOfItemsInCart({
            recipientPhone,
          }).count;

          await WhatsApp.sendSimpleButtons({
            message: `Your cart has been updated.\nNumber of items in cart: ${numberOfItemsInCart}.\n\nWhat do you want to do next?`,
            recipientPhone,
            listOfButtons: [
              {
                title: "Checkout 🛍️",
                id: `checkout`,
              },
              {
                title: "See more products",
                id: "see_categories",
              },
            ],
          });
        }

        if (button_id === "checkout") {
          const finalBill = listOfItemsInCart({ recipientPhone });
          let invoiceText = `List of items in your cart \n`;

          finalBill.products.forEach((item, index) => {
            let serial = index + 1;
            invoiceText += `\n#${serial}: ${item.title} @ $${item.price}`;
          });

          invoiceText += `\n\nTotal: $${finalBill.total}`;

          store.generatePdfInvoice({
            order_details: invoiceText,
            file_path: `./invoice_${name}.pdf`,
          });

          await WhatsApp.sendText({
            message: invoiceText,
            recipientPhone,
          });

          await WhatsApp.sendSimpleButtons({
            recipientPhone,
            message: `Thank you for shopping with us, ${name}.\n\nYour order has been received & will be processed shortly.`,
            message_id,
            listOfButtons: [
              {
                title: "See more products",
                id: "see_categories",
              },
              {
                title: "Print my invoice",
                id: "print_invoice",
              },
            ],
          });

          clearCart({ recipientPhone });
        }

        if (button_id === "print_invoice") {
          // Send the PDF invoice
          await WhatsApp.sendDocument({
            recipientPhone,
            caption: `JS Limited invoice #${name}`,
            file_path: `./invoice_${name}.pdf`,
          });

          // Send the location of our pickup station to the customer, so they can come and pick up their order
          const warehouse = store.generateRandomGeoLocation();

          await WhatsApp.sendText({
            recipientPhone,
            message: `Your order has been fulfilled. Come and pick it up, as you pay, here:`,
          });

          await WhatsApp.sendLocation({
            recipientPhone,
            latitude: warehouse.latitude,
            longitude: warehouse.longitude,
            address: warehouse.address,
            name: "JS Limited Shop",
          });
        }

        if (button_id === "see_categories") {
          const categories = await store.getAllCategories();

          await WhatsApp.sendSimpleButtons({
            message: `We have several categories. \nChoose one of them`,
            recipientPhone,
            listOfButtons: categories.data
              .map((category) => ({
                title: category,
                id: `category_${category}`,
              }))
              .slice(0, 3),
          });
        }

        if (button_id.startsWith("category_")) {
          const selectedCategory = button_id.split("category_")[1];
          const listOfProducts = await store.getProductsInCategory(
            selectedCategory
          );

          const listOfSections = [
            {
              title: `🏆 Top 3: ${selectedCategory}`.substring(0, 24),
              rows: listOfProducts.data
                .map((product) => {
                  let id = `product_${product.id}`.substring(0, 256);
                  let title = product.title.substring(0, 21);
                  let description =
                    `${product.price}\n${product.description}`.substring(0, 68);

                  return {
                    id,
                    title: `${title}...`,
                    description: `$${description}...`,
                  };
                })
                .slice(0, 10),
            },
          ];

          await WhatsApp.sendRadioButtons({
            recipientPhone,
            headerText: `NewYear Offers: ${selectedCategory}`,
            bodyText: `Our Santa 🎅🏿 has lined up some great products for you based on your previous shopping history.\n\nPlease select one of the products below:`,
            footerText: "Powered by: JS Limited",
            listOfSections,
          });
        }

        if (button_id === "speak_to_human") {
          await WhatsApp.sendText({
            recipientPhone,
            message: `Arguably, chatbots are faster than humans.\nCall my human with the below details:`,
          });

          await WhatsApp.sendContact({
            recipientPhone,
            contact_profile: {
              addresses: [
                {
                  city: "California",
                  country: "USA",
                },
              ],
              name: {
                first_name: "David",
                last_name: "Watson",
              },
              org: {
                company: "JS Limited",
              },
              phones: [
                {
                  phone: "+1 (555) 025-3483",
                },
                {
                  phone: "+254712345678",
                },
              ],
            },
          });
        }
      }

      if (type === "radio_button_message") {
        const selectionId = incomingMessage.list_reply.id;

        if (selectionId.startsWith("product_")) {
          const productId = selectionId.split("_")[1];
          const product = await store.getProductById(productId);
          const { price, title, description, category, image, rating } =
            product.data;

          const emojiRating = (rValue) => {
            rValue = Math.floor(rValue || 0);
            let output = [];
            for (let i = 0; i < rValue; i++) output.push("⭐");
            return output.length ? output.join("") : "N/A";
          };

          let text = `_Title_: *${title.trim()}*\n\n\n`;
          text += `_Description_: ${description.trim()}\n\n\n`;
          text += `_Price_: $${price}\n`;
          text += `_Category_: ${category}\n`;
          text += `${rating?.count || 0} shoppers liked this product.\n`;
          text += `_Rated_: ${emojiRating(rating?.rate)}\n`;

          await WhatsApp.sendImage({
            recipientPhone,
            url: image,
            caption: text,
          });

          await WhatsApp.sendSimpleButtons({
            message: `Here is the product, what do you want to do next?`,
            recipientPhone,
            listOfButtons: [
              {
                title: "Add to cart🛒",
                id: `add_to_cart_${productId}`,
              },
              {
                title: "Speak to a human",
                id: "speak_to_human",
              },
              {
                title: "See more products",
                id: "see_categories",
              },
            ],
          });
        }
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.log("error", err);
    return res.sendStatus(500);
  }
});
module.exports = router;
