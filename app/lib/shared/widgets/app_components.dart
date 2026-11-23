import 'package:flutter/material.dart';

import '../../app/theme/app_theme.dart';

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final size = compact ? 38.0 : 54.0;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.greenLight,
        borderRadius: BorderRadius.circular(compact ? 13 : 18),
      ),
      child: Icon(
        Icons.local_grocery_store_rounded,
        color: AppColors.green,
        size: compact ? 22 : 30,
      ),
    );
  }
}

class SectionHeading extends StatelessWidget {
  const SectionHeading({
    required this.title,
    this.actionLabel,
    this.onAction,
    super.key,
  });

  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleLarge),
        ),
        if (actionLabel != null)
          TextButton(
            onPressed: onAction,
            child: Text(
              actionLabel!,
              style: const TextStyle(
                color: AppColors.green,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
      ],
    );
  }
}

class PersonAvatar extends StatelessWidget {
  const PersonAvatar({
    required this.name,
    this.size = 46,
    this.color = AppColors.blue,
    super.key,
  });

  final String name;
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final initials = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .map((part) => part[0])
        .take(2)
        .join()
        .toUpperCase();

    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        shape: BoxShape.circle,
      ),
      child: Text(
        initials,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: size * 0.31,
        ),
      ),
    );
  }
}

class SurfaceCard extends StatelessWidget {
  const SurfaceCard({required this.child, this.padding, super.key});

  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: child,
    );
  }
}
