import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import Chat from '../pages/Chat';
import SymphonyControl from '../pages/SymphonyControl';
import VietnameseAnalysis from '../pages/VietnameseAnalysis';
import Settings from '../pages/Settings';
import Analytics from '../pages/Analytics';
import NavigationBar from '../components/user-interface/NavigationBar';
import NotificationCenter from '../components/user-interface/NotificationCenter';
import './MainWindow.css';

const MainWindow: React.FC = () => {
    return (
        <Router>
            <div className="main-window">
                <NavigationBar />
                <NotificationCenter />
                <Switch>
                    <Route path="/" exact component={Dashboard} />
                    <Route path="/chat" component={Chat} />
                    <Route path="/symphony-control" component={SymphonyControl} />
                    <Route path="/vietnamese-analysis" component={VietnameseAnalysis} />
                    <Route path="/settings" component={Settings} />
                    <Route path="/analytics" component={Analytics} />
                </Switch>
            </div>
        </Router>
    );
};

export default MainWindow;