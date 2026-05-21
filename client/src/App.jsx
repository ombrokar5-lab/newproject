import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const initialStudentForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  major: '',
  enrollmentDate: '',
};

const initialAuthForm = {
  identifier: '',
  email: '',
  phone: '',
  password: '',
  otpCode: '',
};

const studentApi = '/api/students';
const authApi = '/api/auth';

export default function App() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(initialStudentForm);
  const [editId, setEditId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [authUser, setAuthUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [profileMessage, setProfileMessage] = useState('');
  const [otpStatus, setOtpStatus] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '', otpCode: '', targetType: 'email' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      setAuthUser(JSON.parse(user));
    }
    testServerConnection();
  }, []);

  useEffect(() => {
    if (authUser) {
      fetchStudents();
    }
  }, [authUser]);

  async function fetchStudents() {
    if (!authUser) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axios.get(studentApi);
      setStudents(response.data);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unable to load students.';
      setError(errorMsg);
      console.error('Fetch students error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function testServerConnection() {
    try {
      const response = await axios.get('/health');
      console.log('Server health:', response.data);
    } catch (err) {
      console.error('Server connection error:', err);
      setError('Server is not responding. Make sure it is running on port 5000.');
    }
  }

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendRegisterOtp = async () => {
    setAuthError('');
    setOtpStatus('');

    const phone = authForm.phone.trim();
    if (!phone) {
      setAuthError('Enter your phone number before requesting an OTP.');
      return;
    }

    try {
      await axios.post(`${authApi}/send-otp`, {
        phone,
        purpose: 'register',
      });
      setOtpStatus('OTP sent to your phone. Enter it below to complete registration.');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unable to send OTP.';
      setAuthError(errorMsg);
      console.error('Send OTP error:', err);
    }
  };

  const handleLoginRegister = async (event) => {
    event.preventDefault();
    setAuthError('');
    setOtpStatus('');

    try {
      if (authMode === 'register') {
        await axios.post(`${authApi}/register`, {
          email: authForm.email,
          phone: authForm.phone,
          password: authForm.password,
          otpCode: authForm.otpCode,
        });
        setAuthMode('login');
        setAuthForm({ ...initialAuthForm, identifier: authForm.email });
        setError('Registration completed. You can now log in.');
        return;
      }

      const response = await axios.post(`${authApi}/login`, {
        identifier: authForm.identifier,
        password: authForm.password,
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      setAuthUser(user);
      setAuthForm(initialAuthForm);
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unable to authenticate.';
      setAuthError(errorMsg);
      console.error('Auth error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common.Authorization;
    setAuthUser(null);
    setStudents([]);
    setForm(initialStudentForm);
    setEditId('');
    setActiveView('dashboard');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError('');
    setAuthError('');
    setProfileMessage('');
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    setError('');
    setAuthError('');
    setProfileMessage('');
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendPasswordOtp = async (targetType) => {
    setProfileMessage('');
    setError('');
    setPasswordForm((prev) => ({ ...prev, targetType }));

    try {
      const response = await axios.post(`${authApi}/send-password-otp`, { targetType });
      setProfileMessage(response.data.message || `OTP sent to your ${targetType}.`);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unable to send password OTP.';
      setProfileMessage(errorMsg);
      console.error('Send password OTP error:', err);
    }
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    setProfileMessage('');
    setError('');

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setProfileMessage('New password and confirmation are required.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setProfileMessage('New passwords do not match.');
      return;
    }

    try {
      const payload = {
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      };

      if (passwordForm.otpCode) {
        payload.otpCode = passwordForm.otpCode;
        payload.targetType = passwordForm.targetType;
      } else {
        payload.currentPassword = passwordForm.currentPassword;
      }

      const response = await axios.put(`${authApi}/password`, payload);
      setProfileMessage(response.data.message || 'Password updated successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', otpCode: '', targetType: passwordForm.targetType });
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unable to update password.';
      setProfileMessage(errorMsg);
      console.error('Password update error:', err);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        enrollmentDate: form.enrollmentDate || new Date().toISOString().slice(0, 10),
      };

      if (editId) {
        await axios.put(`${studentApi}/${editId}`, payload);
      } else {
        await axios.post(studentApi, payload);
      }

      setForm(initialStudentForm);
      setEditId('');
      fetchStudents();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unable to save the student.';
      setError(errorMsg);
      console.error('Save error:', err);
    }
  };

  const handleEdit = (student) => {
    setEditId(student._id);
    setForm({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      email: student.email || '',
      phone: student.phone || '',
      major: student.major || '',
      enrollmentDate: student.enrollmentDate ? student.enrollmentDate.slice(0, 10) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try {
      await axios.delete(`${studentApi}/${id}`);
      fetchStudents();
    } catch {
      setError('Unable to delete the student.');
    }
  };

  const handleCancel = () => {
    setEditId('');
    setForm(initialStudentForm);
    setError('');
  };

  if (!authUser) {
    return (
      <div className="login-page">
        <div className="app-container">
          <header>
            <h1>Student Management Login</h1>
            <p>Login with email or phone and password.</p>
          </header>

          <section className="form-panel">
            <h2>{authMode === 'register' ? 'Register' : 'Login'}</h2>
            {(authError || error) && <div className="error-box">{authError || error}</div>}
            <form onSubmit={handleLoginRegister}>
            {authMode === 'login' ? (
              <label>
                Email or Phone
                <input
                  name="identifier"
                  value={authForm.identifier}
                  onChange={handleAuthChange}
                  required
                />
              </label>
            ) : (
              <>
                <label>
                  Email
                  <input
                    name="email"
                    type="email"
                    value={authForm.email}
                    onChange={handleAuthChange}
                    required
                  />
                </label>
                <label>
                  Phone
                  <input
                    name="phone"
                    value={authForm.phone}
                    onChange={handleAuthChange}
                    required
                  />
                </label>
                <div className="row otp-controls">
                  <button type="button" className="secondary" onClick={handleSendRegisterOtp}>
                    Send OTP to Phone
                  </button>
                </div>
                {otpStatus && <div className="success-box">{otpStatus}</div>}
                <label>
                  OTP Code
                  <input
                    name="otpCode"
                    value={authForm.otpCode}
                    onChange={handleAuthChange}
                    required={authMode === 'register'}
                  />
                </label>
              </>
            )}
            <label>
              Password
              <input
                name="password"
                type="password"
                value={authForm.password}
                onChange={handleAuthChange}
                required
              />
            </label>
            <div className="button-row">
              <button type="submit">{authMode === 'register' ? 'Register' : 'Login'}</button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setAuthError('');
                  setError('');
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                }}
              >
                {authMode === 'login' ? 'Create account' : 'Have an account? Login'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
    );
  }

  return (
    <div className="app-container">
      <header>
        <h1>Student Management</h1>
        <p>Welcome, {authUser.email || authUser.phone}. Manage students securely.</p>
        <button className="secondary" onClick={handleLogout} style={{ marginTop: '12px' }}>
          Logout
        </button>
      </header>

      <nav className="view-nav">
        <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => handleViewChange('dashboard')}>
          Dashboard
        </button>
        <button className={activeView === 'profile' ? 'active' : ''} onClick={() => handleViewChange('profile')}>
          Profile
        </button>
      </nav>

      {activeView === 'profile' ? (
        <section className="profile-panel">
          <h2>My Profile</h2>
          <p><strong>Email:</strong> {authUser.email}</p>
          <p><strong>Phone:</strong> {authUser.phone || 'Not provided'}</p>
          <p style={{ marginTop: '0.25rem', color: '#2f855a' }}>
            Your student records are private. Only you can view and manage your own data.
          </p>
          {profileMessage && <div className="success-box">{profileMessage}</div>}
          <form onSubmit={handlePasswordUpdate}>
            <div className="row otp-controls">
              <button type="button" className="secondary" onClick={() => handleSendPasswordOtp('email')}>
                Send OTP to Email
              </button>
              {authUser.phone && (
                <button type="button" className="secondary" onClick={() => handleSendPasswordOtp('phone')}>
                  Send OTP to Phone
                </button>
              )}
            </div>
            <label>
              OTP Code
              <input
                name="otpCode"
                value={passwordForm.otpCode}
                onChange={handlePasswordChange}
              />
            </label>
            <p className="otp-note">Enter OTP if you want to update your password using your registered contact method. Otherwise, provide your current password.</p>
            <label>
              Current Password
              <input
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                required={!passwordForm.otpCode}
              />
            </label>
            <label>
              New Password
              <input
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                required
              />
            </label>
            <label>
              Confirm New Password
              <input
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                required
              />
            </label>
            <div className="button-row">
              <button type="submit">Update Password</button>
            </div>
          </form>
        </section>
      ) : (
        <section className="form-panel">
          <h2>{editId ? 'Edit Student' : 'Add Student'}</h2>
          {error && <div className="error-box">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="row">
              <label>
                First Name
                <input name="firstName" value={form.firstName} onChange={handleChange} required />
              </label>
              <label>
                Last Name
                <input name="lastName" value={form.lastName} onChange={handleChange} required />
              </label>
            </div>
            <div className="row">
              <label>
                Email
                <input name="email" type="email" value={form.email} onChange={handleChange} required />
              </label>
              <label>
                Phone
                <input name="phone" value={form.phone} onChange={handleChange} />
              </label>
            </div>
            <div className="row">
              <label>
                Major
                <input name="major" value={form.major} onChange={handleChange} />
              </label>
              <label>
                Enrollment Date
                <input name="enrollmentDate" type="date" value={form.enrollmentDate} onChange={handleChange} />
              </label>
            </div>
            <div className="button-row">
              <button type="submit">{editId ? 'Update Student' : 'Add Student'}</button>
              {editId && (
                <button type="button" className="secondary" onClick={handleCancel}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {activeView === 'dashboard' && (
        <section className="list-panel">
          <h2>Student List</h2>
          {loading ? (
            <p>Loading...</p>
          ) : students.length === 0 ? (
            <p>No students found yet.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Major</th>
                    <th>Enrollment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td>{student.firstName} {student.lastName}</td>
                      <td>{student.email}</td>
                      <td>{student.major || '-'}</td>
                      <td>{student.enrollmentDate ? student.enrollmentDate.slice(0, 10) : '-'}</td>
                      <td>
                        <button className="small" onClick={() => handleEdit(student)}>Edit</button>
                        <button className="small danger" onClick={() => handleDelete(student._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
