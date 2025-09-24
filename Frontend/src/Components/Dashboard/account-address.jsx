// Frontend/src/Components/Dashboard/account-address.jsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../Context/authContext';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

const AddressForm = ({ address, setAddress, onSubmit, title }) => (
  <div className="checkoutDetailsSection" style={{ marginTop: 20 }}>
    <h4>{title}</h4>
    <div className="checkoutDetailsForm">
      <form onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Address Line 1 *"
          value={address.line1 || ''}
          onChange={(e) => setAddress({ ...address, line1: e.target.value })}
          required
        />

        <input
          type="text"
          placeholder="Address Line 2 (optional)"
          value={address.line2 || ''}
          onChange={(e) => setAddress({ ...address, line2: e.target.value })}
        />

        <div className="checkoutDetailsFormRow">
          <input
            type="text"
            placeholder="City *"
            value={address.city || ''}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
            style={{ flex: 1 }}
            required
          />
          <input
            type="text"
            placeholder="State / Division"
            value={address.state || ''}
            onChange={(e) => setAddress({ ...address, state: e.target.value })}
            style={{ flex: 1 }}
          />
        </div>

        <input
          type="text"
          placeholder="Postal Code *"
          value={address.postal_code || ''}
          onChange={(e) => setAddress({ ...address, postal_code: e.target.value })}
          required
        />

        <select
          name="country_code"
          id="country_code"
          value={address.country_code || 'BD'}
          onChange={(e) => setAddress({ ...address, country_code: e.target.value })}
          required
        >
          <option value="" disabled>Country / Region</option>
          <option value="BD">Bangladesh</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <input
            type="checkbox"
            checked={!!address.is_default}
            onChange={(e) => setAddress({ ...address, is_default: e.target.checked })}
          />
          <span>Set as default</span>
        </label>

        <button type="submit" className="btn btn-primary btn-checkout" style={{ marginTop: 12 }}>
          Save Address
        </button>
      </form>
    </div>
  </div>
);

const AccountAddress = () => {
  const { authData } = useAuth();
  const [isEditingBilling, setIsEditingBilling] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [billingAddress, setBillingAddress] = useState({});
  const [shippingAddress, setShippingAddress] = useState({});

  useEffect(() => {
    const fetchAddresses = async (userEmail) => {
      try {
        const response = await fetch(`${API_BASE}/addresses/${encodeURIComponent(userEmail)}`);
        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          const billing = data.data.find(a => a.address_type === 'billing') || {};
          const shipping = data.data.find(a => a.address_type === 'shipping') || {};
          setBillingAddress(billing);
          setShippingAddress(shipping);
        } else {
          console.error("API response does not contain an array of addresses:", data);
        }
      } catch (error) {
        console.error("Error fetching addresses:", error);
      }
    };

    const email = authData?.user?.email;
    if (email) fetchAddresses(email);
  }, [authData?.user?.email]);

  const toPutPayload = (addr) => ({
  line1: addr.line1?.trim() || '',
  line2: addr.line2?.trim() || null,
  city: addr.city?.trim() || '',
  state: addr.state?.trim() || null,
  postal_code: addr.postal_code?.trim() || '',
  country_code: (addr.country_code || 'BD').toUpperCase(),
  is_default: !!addr.is_default,
});


  const handleBillingSubmit = async (e) => {
    e.preventDefault();
    try {



      // Billing
const response = await fetch(
  `${API_BASE}/addresses/${encodeURIComponent(authData.user.email)}/billing`,
  {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPutPayload(billingAddress)), // no address_type here
  }
);

      const data = await response.json();
      if (data.success) {
        setBillingAddress(data.address || billingAddress);
        alert("Billing address updated successfully!");
        setIsEditingBilling(false);
      } else {
        alert(data.message || "Failed to update billing address.");
      }
    } catch (error) {
      console.error('Error updating billing address:', error);
      alert("Failed to update billing address.");
    }
  };

  const handleShippingSubmit = async (e) => {
    e.preventDefault();
    try {
      // Shipping
const response = await fetch(
  `${API_BASE}/addresses/${encodeURIComponent(authData.user.email)}/shipping`,
  {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPutPayload(shippingAddress)), // no address_type here
  }
);

      const data = await response.json();
      if (data.success) {
        setShippingAddress(data.address || shippingAddress);
        alert("Shipping address updated successfully!");
        setIsEditingShipping(false);
      } else {
        alert(data.message || "Failed to update shipping address.");
      }
    } catch (error) {
      console.error('Error updating shipping address:', error);
      alert("Failed to update shipping address.");
    }
  };

  return (
    <main>
      <div className="mb-4 pb-4"></div>
      <section className="my-account container">
        <h2 className="page-title">Addresses</h2>

        <div className="row">
          <div className="col-lg-3">
            <ul className="account-nav">
              <li><a href="/account-dashboard" className="menu-link menu-link_us-s">Dashboard</a></li>
              <li><a href="/account-orders" className="menu-link menu-link_us-s">Orders</a></li>
              <li><a href="/account-address" className="menu-link menu-link_us-s menu-link_active">Addresses</a></li>
              <li><a href="/account-details" className="menu-link menu-link_us-s">Account Details</a></li>
              <li><a href="/account-wishlist" className="menu-link menu-link_us-s">Wishlist</a></li>
              <li><a href="/logout" className="menu-link menu-link_us-s">Logout</a></li>
            </ul>
          </div>

          <div className="col-lg-9">
            <div className="page-content my-account__address">
              <p className="notice">The following addresses will be used on the checkout page by default.</p>

              <div className="my-account__address-list">
                {/* Billing */}
                <div className="my-account__address-item">
                  <div className="my-account__address-item__title">
                    <h5>Billing Address</h5>
                    <a href="#billing" onClick={(e) => { e.preventDefault(); setIsEditingBilling(true); }} className="edit-button">
                      Edit
                    </a>
                  </div>
                  <div className="my-account__address-item__detail">
                    <p>{billingAddress.line1 || 'Not provided'}</p>
                    {billingAddress.line2 && <p>{billingAddress.line2}</p>}
                    <p>{billingAddress.city || 'Not provided'}</p>
                    <p>{billingAddress.state || ''}</p>
                    <p>{billingAddress.postal_code || 'Not provided'}</p>
                    <p>{billingAddress.country_code || 'BD'}</p>
                    {billingAddress.is_default ? <p><em>Default</em></p> : null}
                  </div>
                </div>

                {/* Shipping */}
                <div className="my-account__address-item">
                  <div className="my-account__address-item__title">
                    <h5>Shipping Address</h5>
                    <a href="#shipping" onClick={(e) => { e.preventDefault(); setIsEditingShipping(true); }} className="edit-button">
                      Edit
                    </a>
                  </div>
                  <div className="my-account__address-item__detail">
                    <p>{shippingAddress.line1 || 'Not provided'}</p>
                    {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                    <p>{shippingAddress.city || 'Not provided'}</p>
                    <p>{shippingAddress.state || ''}</p>
                    <p>{shippingAddress.postal_code || 'Not provided'}</p>
                    <p>{shippingAddress.country_code || 'BD'}</p>
                    {shippingAddress.is_default ? <p><em>Default</em></p> : null}
                  </div>
                </div>
              </div>

              {isEditingBilling && (
                <AddressForm
                  address={billingAddress}
                  setAddress={setBillingAddress}
                  onSubmit={handleBillingSubmit}
                  title="Edit Billing Address"
                />
              )}

              {isEditingShipping && (
                <AddressForm
                  address={shippingAddress}
                  setAddress={setShippingAddress}
                  onSubmit={handleShippingSubmit}
                  title="Edit Shipping Address"
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AccountAddress;
