import * as React from "react";
import Link from "next/link";
import { Github, Twitter, Mail } from "lucide-react";

/**
 * Footer component with company information and links
 * Following Vercel design patterns for clean, minimal footer
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: "Platform",
      links: [
        { href: "/marketplace", label: "Marketplace" },
        { href: "/pxl", label: "PXL Currency" },
        { href: "/tiers", label: "Tier System" },
        // Chat temporarily removed
      ],
    },
    {
      title: "Support",
      links: [
        { href: "/help", label: "Help Center" },
        { href: "/contact", label: "Contact Us" },
        { href: "/status", label: "System Status" },
        { href: "/api", label: "API Docs" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/about", label: "About Us" },
        { href: "/careers", label: "Careers" },
        { href: "/blog", label: "Blog" },
        { href: "/press", label: "Press Kit" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms of Service" },
        { href: "/security", label: "Security" },
        { href: "/compliance", label: "Compliance" },
      ],
    },
  ];

  return (
    <footer className="border-t border-gray-800 bg-gray-900">
      <div className="container mx-auto px-4 py-12 md:px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-body font-semibold text-gray-100 mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-body-small text-gray-400 hover:text-white transition-colors duration-150"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Company Info */}
            <div className="flex items-center space-x-3">
              <span className="text-sm text-white" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                HOTPAY
              </span>
              <span className="text-body-small text-gray-400">
                © {currentYear} HOTPAY Platform. All rights reserved.
              </span>
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              <Link
                href="https://github.com"
                className="text-gray-400 hover:text-white transition-colors duration-150"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com"
                className="text-gray-400 hover:text-white transition-colors duration-150"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="mailto:support@pxlgiftcard.com"
                className="text-gray-400 hover:text-white transition-colors duration-150"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Additional Legal Text */}
          <div className="mt-6 text-caption text-gray-500">
            <p>
              PXL is a digital currency for exclusive use within the HOTPAY Platform. 
              Not redeemable for cash. Subject to terms and conditions. 
              Platform operated in compliance with applicable financial regulations.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
