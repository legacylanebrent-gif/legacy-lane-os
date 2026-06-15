import React from 'react';
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50 px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-amber-600" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-900 mb-3">Oops...</h1>
            <p className="text-slate-600 leading-relaxed mb-3">
              We have some growing pains. We're on it and trying to fix the issue now.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Please give us a few moments and come back.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Link to="/MyTickets">
                <Button className="gap-2 bg-orange-600 hover:bg-orange-700">
                  <MessageSquare className="w-4 h-4" />
                  Create Support Ticket
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}