import { useEffect, useState } from 'react';

type User = {
  id: number;
  name: string;
};

function App() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/users') // Replace with deployed backend URL later
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold text-center mb-4">Users</h1>
      <ul className="max-w-md mx-auto bg-white shadow rounded p-4">
        {users.map(u => (
          <li key={u.id} className="border-b py-2">
            {u.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
