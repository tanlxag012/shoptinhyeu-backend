const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SHOP_EMAIL,
    pass: process.env.SHOP_EMAIL_PASSWORD,
  },
});
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Gmail verify lỗi:", err);
  } else {
    console.log("✅ Gmail sẵn sàng gửi mail");
  }
});

const sendOrderMail = async (order) => {
  console.log("📧 Sending order email:", order.orderCode);
  const products = order.items
  .map((item) => `
    <tr>
      <td>${item.name}</td>
      <td align="center">${item.quantity}</td>
      <td align="right">${item.price.toLocaleString("vi-VN")}đ</td>
    </tr>
  `)
  .join("");

  const html = `
    <h2>🛒 Có đơn hàng mới từ website 4EM</h2>

    <p><b>Mã đơn:</b> ${order.orderCode}</p>

    <h3>Thông tin khách hàng</h3>

    <p>
      Họ tên: ${order.shippingAddress.fullName}<br/>
      SĐT: ${order.shippingAddress.phone}<br/>
      Địa chỉ:
      ${order.shippingAddress.street},
      ${order.shippingAddress.ward},
      ${order.shippingAddress.district},
      ${order.shippingAddress.province}
    </p>

    <table border="1" cellpadding="8" cellspacing="0">
      <thead>
        <tr>
          <th>Sản phẩm</th>
          <th>SL</th>
          <th>Giá</th>
        </tr>
      </thead>

      <tbody>
        ${products}
      </tbody>
    </table>

    <h3>Tổng tiền: ${order.total.toLocaleString()}đ</h3>

    <p>Thanh toán: ${order.paymentMethod}</p>
    <p>Ghi chú: ${order.note || "Không có"}</p>
  `;

  const info = await transporter.sendMail({
    from: `"Website 4EM" <${process.env.SHOP_EMAIL}>`,
    to: process.env.ORDER_RECEIVER_EMAIL,
    subject: `Đơn hàng mới - ${order.orderCode}`,
    html,
  });

  console.log("✅ Mail sent:", info.messageId);
};

module.exports = { sendOrderMail };