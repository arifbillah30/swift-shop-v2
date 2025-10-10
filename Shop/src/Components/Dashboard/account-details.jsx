import React, { useState, useEffect } from 'react';
import { useAuth } from '../../Context/authContext';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000';

const AccountDetails = () => {
  const { authData, updateUserData } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authData?.user) {
      setFormData(prev => ({
        ...prev,
        firstName: authData.user.firstName || '',
        lastName: authData.user.lastName || '',
        displayName: authData.user.displayName || '',
        email: authData.user.email || '',
        phone: authData.user.phone || '',
      }));
    }
  }, [authData]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName) errors.firstName = 'First name is required.';
    if (!formData.lastName) errors.lastName = 'Last name is required.';
    if (!formData.displayName) errors.displayName = 'Display name is required.';
    if (!formData.email) errors.email = 'Email is required.';

    // Password rules: only validate if user is trying to change it
    if (formData.newPassword) {
      if (!formData.currentPassword) errors.currentPassword = 'Current password is required.';
      if (formData.newPassword !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords did not match!';
      }
      if (formData.newPassword.length < 6) {
        errors.newPassword = 'New password should be at least 6 characters.';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setFormErrors(prev => ({ ...prev, server: undefined }));

    const token = sessionStorage.getItem('authToken'); // your context likely put this here

    try {
      // 1) Update account profile
      {
        const res = await fetch(`${API_BASE}/api/v1/auth/update-account`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            email: (formData.email || '').trim().toLowerCase(), // backend requires email + displayName
            displayName: formData.displayName.trim(),
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            phone: formData.phone?.trim() || null,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to update account.');
        }

        // keep client state in sync
        updateUserData({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          displayName: formData.displayName.trim(),
          email: (formData.email || '').trim().toLowerCase(),
          phone: formData.phone?.trim() || '',
        });
      }

      // 2) Update password (only if user entered a new one)
      if (formData.newPassword) {
        const res2 = await fetch(`${API_BASE}/api/v1/auth/update-password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            email: (formData.email || '').trim().toLowerCase(),
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
          }),
        });

        if (!res2.ok) {
          const data = await res2.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to update password.');
        }
      }

      alert('Account details updated successfully!');
      // Clear password fields after success
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      console.error(err);
      setFormErrors(prev => ({ ...prev, server: err.message || 'Update failed' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main>
      <div className="mb-4 pb-4"></div>
      <section className="my-account container">
        <h2 className="page-title">Account Details</h2>
        <div className="row">
          <div className="col-lg-3">
            <ul className="account-nav">
              <li><a href="/account-dashboard" className="menu-link menu-link_us-s">Dashboard</a></li>
              <li><a href="/account-orders" className="menu-link menu-link_us-s">Orders</a></li>
              <li><a href="/account-address" className="menu-link menu-link_us-s">Addresses</a></li>
              <li><a href="/account-edit" className="menu-link menu-link_us-s menu-link_active">Account Details</a></li>
              <li><a href="/account-wishlist" className="menu-link menu-link_us-s">Wishlist</a></li>
              <li><a href="/logout" className="menu-link menu-link_us-s">Logout</a></li>
            </ul>
          </div>

          <div className="col-lg-9">
            <div className="page-content my-account__edit">
              <div className="my-account__edit-form">
                <form name="account_edit_form" className="needs-validation" noValidate onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-floating my-3">
                        <input
                          type="text"
                          className={`form-control ${formErrors.firstName ? 'is-invalid' : ''}`}
                          id="firstName"
                          placeholder="First Name"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="firstName">First Name</label>
                        {formErrors.firstName && <div className="invalid-feedback">{formErrors.firstName}</div>}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="form-floating my-3">
                        <input
                          type="text"
                          className={`form-control ${formErrors.lastName ? 'is-invalid' : ''}`}
                          id="lastName"
                          placeholder="Last Name"
                          value={formData.lastName}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="lastName">Last Name</label>
                        {formErrors.lastName && <div className="invalid-feedback">{formErrors.lastName}</div>}
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="form-floating my-3">
                        <input
                          type="text"
                          className={`form-control ${formErrors.displayName ? 'is-invalid' : ''}`}
                          id="displayName"
                          placeholder="Display Name"
                          value={formData.displayName}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor="displayName">Display Name</label>
                        {formErrors.displayName && <div className="invalid-feedback">{formErrors.displayName}</div>}
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="form-floating my-3">
                        <input
                          type="email"
                          className={`form-control ${formErrors.email ? 'is-invalid' : ''}`}
                          id="email"
                          placeholder="Email Address"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          disabled
                        />
                        <label htmlFor="email">Email Address</label>
                        {formErrors.email && <div className="invalid-feedback">{formErrors.email}</div>}
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="form-floating my-3">
                        <input
                          type="tel"
                          className="form-control"
                          id="phone"
                          placeholder="Phone"
                          value={formData.phone}
                          onChange={handleChange}
                        />
                        <label htmlFor="phone">Phone</label>
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="my-3">
                        <h5 className="text-uppercase mb-0">Password Change</h5>
                        <small className="text-muted">Leave blank if you do not want to change the password.</small>
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="form-floating my-3">
                        <input
                          type="password"
                          className={`form-control ${formErrors.currentPassword ? 'is-invalid' : ''}`}
                          id="currentPassword"
                          placeholder="Current password"
                          value={formData.currentPassword}
                          onChange={handleChange}
                        />
                        <label htmlFor="currentPassword">Current password</label>
                        {formErrors.currentPassword && <div className="invalid-feedback">{formErrors.currentPassword}</div>}
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="form-floating my-3">
                        <input
                          type="password"
                          className={`form-control ${formErrors.newPassword ? 'is-invalid' : ''}`}
                          id="newPassword"
                          placeholder="New password"
                          value={formData.newPassword}
                          onChange={handleChange}
                        />
                        <label htmlFor="newPassword">New password</label>
                        {formErrors.newPassword && <div className="invalid-feedback">{formErrors.newPassword}</div>}
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="form-floating my-3">
                        <input
                          type="password"
                          className={`form-control ${formErrors.confirmPassword ? 'is-invalid' : ''}`}
                          id="confirmPassword"
                          placeholder="Confirm new password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                        />
                        <label htmlFor="confirmPassword">Confirm new password</label>
                        {formErrors.confirmPassword && <div className="invalid-feedback">{formErrors.confirmPassword}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="form-footer">
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? 'Updating…' : 'Update Account'}
                    </button>
                    {formErrors.server && <div className="text-danger mt-2">{formErrors.server}</div>}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AccountDetails;
