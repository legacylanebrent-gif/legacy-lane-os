import React from 'react';
import { AlertTriangle, RefreshCw, MessageSquare, Home, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

function getSessionId() {
  try {
    let sid = sessionStorage.getItem('es_session_id');
    if (!sid) {
      sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('es_session_id', sid);
    }
    return sid;
  } catch {
    return 'sess_unknown';
  }
}

function getBrowserInfo() {
  if (typeof navigator === 'undefined') return { browser: 'unknown', device: 'unknown' };
  const ua = navigator.userAgent;
  let browser = 'unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';

  let device = 'desktop';
  if (/Mobile|Android|iPhone/.test(ua)) device = 'mobile';
  else if (/iPad|Tablet/.test(ua)) device = 'tablet';

  return { browser, device };
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, recoveryLogged: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    // Log to Recovery Agent backend
    const { browser, device } = getBrowserInfo();
    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
    const pageModule = typeof window !== 'undefined' ? window.location.pathname : '';

    base44.functions.invoke('logRecoveryEvent', {
      event_type: 'react_render_error',
      severity: 'high',
      page_url: pageUrl,
      page_module: pageModule,
      action_attempted: 'page_render',
      error_message: error?.message || String(error),
      error_stack: errorInfo?.componentStack || error?.stack || '',
      browser,
      device,
      session_id: getSessionId(),
    }).catch(() => { /* silent — don't block recovery UI */ });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, recoveryLogged: false });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, recoveryLogged: false });
    if (typeof window !== 'undefined') window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-orange-50 to-cyan-50 px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-orange-600" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-900 mb-3">
              Looks like something didn't go as planned.
            </h1>
            <p className="text-slate-600 leading-relaxed mb-2">
              I've already reported the issue to the EstateSalen team and I'll help you continue.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              You can try again, go back to the home page, or create a support ticket.
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
              <Button
                onClick={this.handleGoHome}
                className="gap-2 bg-orange-600 hover:bg-orange-700"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
              <Link to="/MyTickets">
                <Button variant="ghost" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Support
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