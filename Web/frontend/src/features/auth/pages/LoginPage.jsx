import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useFormik } from "formik";
import * as Yup from "yup";
import { motion } from "framer-motion";
import { Lock, Mail, ShieldCheck, ArrowRight, Radio } from "lucide-react";
import api from "../../../services/api";
import { setAuth } from "../../../store/slices/authSlice";
import { Button } from "../../../components/common/ui";
import BrandLogo from "../../../components/common/BrandLogo";
import { useToast } from "../../../components/common/Toast";
import { rise } from "../../../utils/motion";

const loginSchema = Yup.object({
  email: Yup.string()
    .email("Please enter a valid email address")
    .required("Email is required"),
  password: Yup.string().required("Password is required"),
});

export const LoginPage = () => {
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const response = await api.post("/auth/admin/login", values);
        if (response.success && response.data) {
          dispatch(setAuth(response.data));
          showToast("Welcome back, Super Administrator", "success");
        }
      } catch (err) {
        showToast(
          err.message || "Authentication failed. Please verify credentials.",
          "error",
        );
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4 sm:p-6">
      <motion.div
        variants={rise}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md"
      >
        <div className="overflow-hidden rounded-[28px] bg-panel border border-line shadow-lift p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <BrandLogo size={56} />
            </div>
            <h1 className="text-2xl font-bold text-ink tracking-tight">
              SMS Gateway Console
            </h1>
            <p className="text-[13px] text-muted mt-1">
              Military-Grade AES-256-GCM Secure SMS Synchronization
            </p>
          </div>

          {/* Form */}
          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="admin@gmail.com"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-line-strong text-[14px] text-ink focus:outline-none focus:border-brand-700 transition-colors"
                />
              </div>
              {formik.touched.email && formik.errors.email && (
                <p className="text-[12px] text-danger mt-1 font-medium">
                  {formik.errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-ink-2 uppercase tracking-wider mb-1.5">
                Master Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                <input
                  type="password"
                  name="password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="••••••••••••"
                  className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-line-strong text-[14px] text-ink focus:outline-none focus:border-brand-700 transition-colors"
                />
              </div>
              {formik.touched.password && formik.errors.password && (
                <p className="text-[12px] text-danger mt-1 font-medium">
                  {formik.errors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full mt-2"
            >
              <span>
                {loading ? "Authenticating Gateway..." : "Unlock Console"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Security Banner */}
          <div className="mt-6 pt-5 border-t border-line flex items-center justify-center gap-2 text-[12px] text-muted text-center">
            <ShieldCheck className="w-4 h-4 text-brand-700" />
            <span>Encrypted with SHA-256 HKDF & AES-256-GCM</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
