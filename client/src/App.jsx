import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  major: '',
  enrollmentDate: '',
};

const api = '/api/students';

export default function App() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudents();
    testServerConnection();
  }, []);

  async function fetchStudents() {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(api);
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
        await axios.put(`${api}/${editId}`, payload);
      } else {
        await axios.post(api, payload);
      }

      setForm(initialForm);
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
      await axios.delete(`${api}/${id}`);
      fetchStudents();
    } catch {
      setError('Unable to delete the student.');
    }
  };

  const handleCancel = () => {
    setEditId('');
    setForm(initialForm);
    setError('');
  };

  return (
    <div className="app-container">
      <header>
        <h1>Student Management</h1>
        <p>Manage students with create, read, update, and delete operations.</p>
      </header>

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
    </div>
  );
}
