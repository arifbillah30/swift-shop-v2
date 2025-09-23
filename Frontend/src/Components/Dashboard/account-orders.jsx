<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './account-orders.css';

const AccountOrders = () => {
  const [orders, setOrders] = useState([]); // State to store fetched orders
  const [selectedOrder, setSelectedOrder] = useState(null); // State for the selected order to display in modal
  const [isModalOpen, setIsModalOpen] = useState(false); // State to manage modal visibility

  const user = JSON.parse(localStorage.getItem('user'));

  const handleGetOrders = async (userEmail = '') => {
    try {
      const response = await fetch(`http://localhost:5000/orders?userEmail=${userEmail}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Error:', data.message);
      } else {
        const { orders } = await response.json();
        setOrders(orders); // Store the fetched orders in the state
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  useEffect(() => {
    if (user && user.email) {
      handleGetOrders(user.email); // Fetch orders when the component mounts
    }
  }, [user]);

  // Function to open modal and display order details
  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Function to close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

=======
import React from 'react';
import { Link } from 'react-router-dom';

const AccountOrders = () => {
>>>>>>> 6794976 (Add files with proper line endings)
  return (
    <main>
      <div className="mb-4 pb-4"></div>
      <section className="my-account container">
        <h2 className="page-title">Orders</h2>
        <div className="row">
          <div className="col-lg-3">
            <ul className="account-nav">
<<<<<<< HEAD
              <li><Link to="/account-dashboard" className="menu-link">Dashboard</Link></li>
              <li><Link to="/account-orders" className="menu-link menu-link_active">Orders</Link></li>
              <li><Link to="/account-address" className="menu-link">Addresses</Link></li>
              <li><Link to="/account-details" className="menu-link">Account Details</Link></li>
              <li><Link to="/account-wishlist" className="menu-link">Wishlist</Link></li>
              <li><Link to="/login-register" className="menu-link">Logout</Link></li>
=======
              <li><Link to="/account-dashboard" className="menu-link menu-link_us-s">Dashboard</Link></li>
              <li><Link to="/account-orders" className="menu-link menu-link_us-s menu-link_active">Orders</Link></li>
              <li><Link to="/account-edit-address" className="menu-link menu-link_us-s">Addresses</Link></li>
              <li><Link to="/account-details" className="menu-link menu-link_us-s">Account Details</Link></li>
              <li><Link to="/account-wishlist" className="menu-link menu-link_us-s">Wishlist</Link></li>
              <li><Link to="/login-register" className="menu-link menu-link_us-s">Logout</Link></li>
>>>>>>> 6794976 (Add files with proper line endings)
            </ul>
          </div>
          <div className="col-lg-9">
            <div className="page-content my-account__orders-list">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
<<<<<<< HEAD
                  {orders.map((order, index) => (
                    <tr key={index}>
                      <td>#{order.orders[0].id}</td>
                      <td>{new Date(order.createdDate).toLocaleDateString()}</td>
                      <td>{order.orders[0].status}</td>
                      <td>${order.totalPrice} for {order.totalItem} items</td>
                      <td>
                        <button className="btn-primary" onClick={() => handleViewOrder(order)}>
                          VIEW
                        </button>
                      </td>
                    </tr>
                  ))}
=======
                  <tr>
                    <td>#2416</td>
                    <td>October 1, 2023</td>
                    <td>On hold</td>
                    <td>$1,200.65 for 3 items</td>
                    <td><button className="btn btn-primary">VIEW</button></td>
                  </tr>
                  <tr>
                    <td>#2417</td>
                    <td>October 2, 2023</td>
                    <td>On hold</td>
                    <td>$1,200.65 for 3 items</td>
                    <td><button className="btn btn-primary">VIEW</button></td>
                  </tr>
                  <tr>
                    <td>#2418</td>
                    <td>October 3, 2023</td>
                    <td>On hold</td>
                    <td>$1,200.65 for 3 items</td>
                    <td><button className="btn btn-primary">VIEW</button></td>
                  </tr>
                  <tr>
                    <td>#2419</td>
                    <td>October 4, 2023</td>
                    <td>On hold</td>
                    <td>$1,200.65 for 3 items</td>
                    <td><button className="btn btn-primary">VIEW</button></td>
                  </tr>
>>>>>>> 6794976 (Add files with proper line endings)
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
<<<<<<< HEAD

      {/* Modal for viewing order details */}
      {isModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-button" onClick={handleCloseModal}>&times;</span>
            <h3>Order Details</h3>
            <p><strong>Order ID:</strong> #{selectedOrder.orders[0].id}</p>
            <p><strong>Date:</strong> {new Date(selectedOrder.createdDate).toLocaleDateString()}</p>
            <p><strong>Total:</strong> ${selectedOrder.totalPrice} for {selectedOrder.totalItem} items</p>
            <p><strong>Payment Method:</strong>{selectedOrder.orders[0].paymentMethod}</p>
            <h4>Items:</h4>
            <ul>
              {selectedOrder.orders.map((item, idx) => (
                <li key={idx}>
                  <strong>{item.productName}</strong> - ${item.productPrice} x {item.quantity} 
                </li>
              ))}
            </ul>
            <button className="btn btn-primary" onClick={handleCloseModal}>Close</button>
          </div>
        </div>
      )}
=======
      <div className="mb-5 pb-xl-5"></div>
>>>>>>> 6794976 (Add files with proper line endings)
    </main>
  );
};

<<<<<<< HEAD
export default AccountOrders;
=======
export default AccountOrders;
>>>>>>> 6794976 (Add files with proper line endings)
