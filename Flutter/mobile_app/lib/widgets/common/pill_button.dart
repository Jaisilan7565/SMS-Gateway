import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

enum PillButtonVariant { primary, outline, ghost, light, danger }

class PillButton extends StatefulWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final PillButtonVariant variant;
  final double height;
  final EdgeInsetsGeometry padding;

  const PillButton({
    super.key,
    required this.child,
    required this.onPressed,
    this.variant = PillButtonVariant.primary,
    this.height = 46,
    this.padding = const EdgeInsets.symmetric(horizontal: 22),
  });

  @override
  State<PillButton> createState() => _PillButtonState();
}

class _PillButtonState extends State<PillButton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    BoxDecoration decoration;

    switch (widget.variant) {
      case PillButtonVariant.primary:
        decoration = BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.brand800, AppColors.brand900],
          ),
          borderRadius: BorderRadius.circular(999),
          boxShadow: [
            BoxShadow(
              color: AppColors.brand900.withValues(alpha: 0.35),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        );
        break;
      case PillButtonVariant.light:
        decoration = BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(999),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1F000000),
              blurRadius: 10,
              offset: Offset(0, 3),
            ),
          ],
        );
        break;
      case PillButtonVariant.outline:
        decoration = BoxDecoration(
          color: AppColors.card,
          border: Border.all(color: AppColors.lineStrong),
          borderRadius: BorderRadius.circular(999),
        );
        break;
      case PillButtonVariant.danger:
        decoration = BoxDecoration(
          color: AppColors.danger,
          borderRadius: BorderRadius.circular(999),
        );
        break;
      case PillButtonVariant.ghost:
        decoration = BoxDecoration(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        );
        break;
    }

    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) => _controller.reverse(),
      onTapCancel: () => _controller.reverse(),
      onTap: widget.onPressed,
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) => Transform.scale(
          scale: _scaleAnimation.value,
          child: Container(
            height: widget.height,
            padding: widget.padding,
            decoration: decoration,
            alignment: Alignment.center,
            child: widget.child,
          ),
        ),
      ),
    );
  }
}
