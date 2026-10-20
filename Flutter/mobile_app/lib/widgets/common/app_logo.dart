import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class AppLogo extends StatelessWidget {
  final double size;
  final bool showBadge;

  const AppLogo({
    super.key,
    this.size = 56,
    this.showBadge = true,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF145534), // Forest brand 800
                Color(0xFF072717), // Deep dark green brand 950
              ],
            ),
            borderRadius: BorderRadius.circular(size * 0.32),
            border: Border.all(
              color: const Color(0xFF5DBD8B).withOpacity(0.4),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF145534).withOpacity(0.35),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Radio wave radar circle
                Container(
                  width: size * 0.62,
                  height: size * 0.62,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0xFF5DBD8B).withOpacity(0.25),
                      width: 1,
                    ),
                  ),
                ),
                // Center icon
                Icon(
                  Icons.shield_outlined,
                  size: size * 0.52,
                  color: const Color(0xFF5DBD8B),
                ),
                Icon(
                  Icons.lock_rounded,
                  size: size * 0.28,
                  color: Colors.white,
                ),
              ],
            ),
          ),
        ),
        if (showBadge)
          Positioned(
            top: -2,
            right: -2,
            child: Container(
              width: size * 0.22,
              height: size * 0.22,
              decoration: BoxDecoration(
                color: const Color(0xFF34D399),
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.canvas, width: 2),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x6034D399),
                    blurRadius: 6,
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
