import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * The "start your own estate sale company" opportunity now lives in the
 * Legacy Lane Business Builder page. This route stays so every existing
 * link and footer entry keeps working.
 */
export default function StartYourCompany() {
  return <Navigate to="/LandingPageBizInABox" replace />;
}