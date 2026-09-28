import Order from '../models/Order.js';
const canAccessOrder = (req, order) => {
  const userId = String(req.user?.id || req.user?._id || "");
  const orderCustomerId = String(order.customerId);

  const isOwner = userId === orderCustomerId;
  const isAdmin = ["admin", "restaurant"].includes(req.user?.role);

  return isOwner || isAdmin;
};

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const {
      customerId,
      restaurantId,
      items,
      totalAmount,
      paymentMethod,
      deliveryAddress,
      phoneNumber,
      deliveryNotes,
      customerDetails
    } = req.body;

    // Validate required fields
    if (
      !customerId ||
      typeof customerId !== "string" ||
      !customerId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid customerId is required"
      });
    }

    if (
      !restaurantId ||
      typeof restaurantId !== "string" ||
      !restaurantId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid restaurantId is required"
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one order item is required"
      });
    }

    if (
      !phoneNumber ||
      typeof phoneNumber !== "string" ||
      !/^\+?[1-9]\d{9,14}$/.test(phoneNumber)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid phone number is required"
      });
    }

    if (
      !paymentMethod ||
      !["card", "cash"].includes(paymentMethod)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment method must be either card or cash"
      });
    }

    if (
      !deliveryAddress ||
      typeof deliveryAddress !== "string" ||
      !deliveryAddress.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid delivery address is required"
      });
    }

    // Validate each order item
for (const item of items) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return res.status(400).json({
      success: false,
      message: "Each order item must be a valid object"
    });
  }

  if (
    !item.name ||
    typeof item.name !== "string" ||
    !item.name.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Each item must have a valid name"
    });
  }

  if (
    typeof item.price !== "number" ||
    !Number.isFinite(item.price) ||
    item.price <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Each item price must be greater than zero"
    });
  }

  if (
    !Number.isInteger(item.quantity) ||
    item.quantity <= 0
  ) {
    return res.status(400).json({
      success: false,
      message: "Each item quantity must be a positive integer"
    });
  }
}

    // Calculate the total on the server
    const calculatedTotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (
      typeof totalAmount !== "number" ||
      !Number.isFinite(totalAmount) ||
      totalAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid totalAmount is required"
      });
    }

    // Prevent client-side total manipulation
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: "Total amount does not match the order items"
      });
    }

    const order = new Order({
      customerId: customerId.trim(),
      restaurantId: restaurantId.trim(),
      items,
      totalAmount: calculatedTotal,
      // Status is assigned by the server
      paymentMethod,
      deliveryAddress: deliveryAddress.trim(),
      phoneNumber,
      deliveryNotes,
      customerDetails
    });

    const savedOrder = await order.save();

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error("Error creating order:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create order"
    });
  }
};

// Get all orders
export const getOrders = async (req, res) => {
  try {
    const userId = String(req.user?.id || req.user?._id || "");
    const isAdmin = ["admin", "restaurant"].includes(req.user?.role);

    const filter = isAdmin ? {} : { customerId: userId };

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch orders"
    });
  }
};
// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this order"
      });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid order ID"
    });
  }
};

// Update order
export const updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this order"
      });
    }

    const allowedFields = [
      "items",
      "totalAmount",
      "paymentMethod",
      "deliveryAddress"
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        order[field] = req.body[field];
      }
    }

    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);

    res.status(400).json({
      success: false,
      message: "Unable to update order"
    });
  }
};
// Delete order
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this order"
      });
    }

    await order.deleteOne();

    res.json({
      success: true,
      message: "Order deleted successfully"
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid order ID"
    });
  }
};
// cancel order 
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this order"
      });
    }

    order.status = "Cancelled";
    await order.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order
    });
  } catch (error) {
    console.error("Cancel order error:", error);

    res.status(400).json({
      success: false,
      message: "Unable to cancel order"
    });
  }
};
// Update the updateRating method with better debugging and error handling
export const updateRating = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;

    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5"
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to rate this order"
      });
    }

    order.rating = {
      score: rating,
      feedback: typeof feedback === "string" ? feedback.trim() : "",
      createdAt: new Date()
    };

    await order.save();

    res.status(200).json({
      success: true,
      message: "Rating updated successfully",
      order: {
        id: order._id,
        rating: order.rating
      }
    });
  } catch (error) {
    console.error("Error updating order rating:", error);

    res.status(400).json({
      success: false,
      message: "Unable to update rating"
    });
  }
};