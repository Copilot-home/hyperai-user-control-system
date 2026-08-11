import React from 'react';
import { BrowserRouter as Router, Redirect, Route, Switch } from 'react-router-dom';
import { AutonomyProvider } from './contexts/AutonomyContext';
import { EmpathyProvider } from './contexts/EmpathyContext';
import { SymphonyProvider } from './contexts/SymphonyContext';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import WorkspaceHome from './pages/WorkspaceHome';
import Chat from './pages/Chat';
import Missions from './pages/Missions';
import Systems from './pages/Systems';
import SymphonyControl from './pages/SymphonyControl';
import Settings from './pages/Settings';

const App: React.FC = () => {
    return (
        <Router>
            <EmpathyProvider>
                <SymphonyProvider>
                    <UserProvider>
                        <AutonomyProvider>
                            <ThemeProvider>
                                <Switch>
                                    <Route path="/" exact component={WorkspaceHome} />
                                    <Route path="/chat" component={Chat} />
                                    <Route path="/missions" component={Missions} />
                                    <Route path="/systems" component={Systems} />
                                    <Route path="/symphony-control" component={SymphonyControl} />
                                    <Route path="/settings" component={Settings} />
                                    <Route render={() => <Redirect to="/" />} />
                                </Switch>
                            </ThemeProvider>
                        </AutonomyProvider>
                    </UserProvider>
                </SymphonyProvider>
            </EmpathyProvider>
        </Router>
    );
};

export default App;
