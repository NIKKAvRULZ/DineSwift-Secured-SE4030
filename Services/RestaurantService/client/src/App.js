import React, { useState } from 'react';
import { Button } from '@mui/material';
import ManagerLogin from './components/ManagerLogin';
import { setAccessToken } from './api';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import theme from './theme';
import Layout from './components/layout/Layout';
import RestaurantList from './components/RestaurantList';
import RestaurantDetail from './components/RestaurantDetail';
import AddRestaurant from './components/AddRestaurant';
import EditRestaurant from './components/EditRestaurant';
import AddMenuItem from './components/AddMenuItem';
import EditMenuItem from './components/EditMenuItem';

function App() {
    const [signedIn, setSignedIn] = useState(false);
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Layout>
                    {signedIn ? <Button onClick={() => { setAccessToken(null); setSignedIn(false); }}>Sign out / switch account</Button>
                        : <ManagerLogin onLogin={() => setSignedIn(true)} />}
                    <Routes>
                        <Route path="/" element={<RestaurantList />} />
                        <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                        <Route path="/add-restaurant" element={<AddRestaurant />} />
                        <Route path="/edit-restaurant/:id" element={<EditRestaurant />} />
                        <Route path="/add-menu-item/:restaurantId" element={<AddMenuItem />} />
                        <Route path="/edit-menu-item/:id" element={<EditMenuItem />} />
                    </Routes>
                </Layout>
            </Router>
        </ThemeProvider>
    );
}

export default App;
