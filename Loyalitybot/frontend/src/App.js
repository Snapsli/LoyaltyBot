import './App.css';
import { UserProvider } from './context/UserContext';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './components/AppRoutes';


const App = () => {
  return (
    <UserProvider>
      <Router>
        <AppRoutes />
      </Router>
    </UserProvider>
  );
};

export default App;
