import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String label;
  final Color textColor;
  final Color backgroundColor;
  final Color borderColor;

  const StatusBadge({
    super.key,
    required this.label,
    required this.textColor,
    required this.backgroundColor,
    required this.borderColor,
  });

  factory StatusBadge.good(String label) {
    return StatusBadge(
      label: label,
      textColor: AppColors.brand700,
      backgroundColor: AppColors.brand50,
      borderColor: AppColors.brand600.withValues(alpha: 0.4),
    );
  }

  factory StatusBadge.sim1(String label) {
    return StatusBadge(
      label: label,
      textColor: AppColors.sim1,
      backgroundColor: const Color(0xFFEFF6FF),
      borderColor: AppColors.sim1.withValues(alpha: 0.3),
    );
  }

  factory StatusBadge.sim2(String label) {
    return StatusBadge(
      label: label,
      textColor: AppColors.sim2,
      backgroundColor: const Color(0xFFF5F3FF),
      borderColor: AppColors.sim2.withValues(alpha: 0.3),
    );
  }

  factory StatusBadge.off(String label) {
    return StatusBadge(
      label: label,
      textColor: AppColors.muted,
      backgroundColor: AppColors.panel,
      borderColor: AppColors.lineStrong,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: textColor,
          fontSize: 12,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
      ),
    );
  }
}
