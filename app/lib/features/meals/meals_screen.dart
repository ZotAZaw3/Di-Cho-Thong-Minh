import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/theme/app_theme.dart';
import '../../features/grocery/data/grocery_models.dart';
import '../../features/grocery/state/grocery_provider.dart';
import '../../shared/widgets/app_components.dart';

class MealsScreen extends StatelessWidget {
  const MealsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<GroceryProvider>(
      builder: (context, grocery, _) {
        return RefreshIndicator(
          onRefresh: () async {
            await Future.wait([grocery.loadMeals(), grocery.loadRecipes()]);
          },
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Bữa ăn & công thức',
                            style: Theme.of(context).textTheme.headlineSmall),
                        const SizedBox(height: 4),
                        const Text(
                          'Lên kế hoạch bữa ăn cho gia đình',
                          style: TextStyle(
                              color: AppColors.muted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  IconButton.filled(
                    tooltip: 'Cập nhật bữa ăn',
                    onPressed: grocery.updatingMeal
                        ? null
                        : () => _editMeal(context, grocery),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.green,
                      foregroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.add_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              SectionHeading(
                title: 'Kế hoạch bữa ăn',
                actionLabel: '${grocery.mealPlans.length} bữa',
                onAction: () => _editMeal(context, grocery),
              ),
              const SizedBox(height: 8),
              if (grocery.loadingMeals && grocery.mealPlans.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(28),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (grocery.mealsError != null &&
                  grocery.mealPlans.isEmpty)
                _ErrorPanel(
                  message: grocery.mealsError!,
                  onRetry: grocery.loadMeals,
                )
              else if (grocery.mealPlans.isEmpty)
                _EmptyMeals(onAdd: () => _editMeal(context, grocery))
              else
                SurfaceCard(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Column(
                    children: [
                      for (var index = 0;
                          index < grocery.mealPlans.length;
                          index++) ...[
                        _MealTile(meal: grocery.mealPlans[index]),
                        if (index < grocery.mealPlans.length - 1)
                          const Divider(height: 1),
                      ],
                    ],
                  ),
                ),
              if (grocery.mealsError != null &&
                  grocery.mealPlans.isNotEmpty) ...[
                const SizedBox(height: 10),
                _ErrorPanel(
                  message: grocery.mealsError!,
                  onRetry: grocery.loadMeals,
                ),
              ],
              const SizedBox(height: 24),
              SectionHeading(
                title: 'Công thức nấu ăn',
                actionLabel: '${grocery.recipes.length} món',
              ),
              const SizedBox(height: 8),
              if (grocery.loadingRecipes && grocery.recipes.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(28),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (grocery.recipesError != null &&
                  grocery.recipes.isEmpty)
                _ErrorPanel(
                  message: grocery.recipesError!,
                  onRetry: grocery.loadRecipes,
                )
              else if (grocery.recipes.isEmpty)
                const _EmptyRecipes()
              else
                ...grocery.recipes.map(
                  (recipe) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _RecipeTile(
                      recipe: recipe,
                      isDeleting:
                          grocery.deletingRecipeIds.contains(recipe.id),
                      onDelete: () => _deleteRecipe(context, grocery, recipe),
                    ),
                  ),
                ),
              if (grocery.recipesError != null &&
                  grocery.recipes.isNotEmpty) ...[
                const SizedBox(height: 10),
                _ErrorPanel(
                  message: grocery.recipesError!,
                  onRetry: grocery.loadRecipes,
                ),
              ],
              const SizedBox(height: 12),
              const Text(
                'Dữ liệu hiển thị từ máy chủ',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.muted, fontSize: 11),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _editMeal(
    BuildContext context,
    GroceryProvider grocery,
  ) async {
    final formKey = GlobalKey<FormState>();
    final titleController = TextEditingController();
    var date = DateTime.now();
    var mealType = 'Bữa sáng';
    var submitting = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            22,
            20,
            MediaQuery.viewInsetsOf(context).bottom + 24,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Cập nhật kế hoạch bữa ăn',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 18),
                TextFormField(
                  controller: titleController,
                  decoration: const InputDecoration(
                    labelText: 'Tên món ăn',
                    prefixIcon: Icon(Icons.restaurant_menu_rounded),
                  ),
                  validator: (value) => value == null || value.trim().isEmpty
                      ? 'Nhập tên món ăn'
                      : null,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: mealType,
                  decoration: const InputDecoration(
                    labelText: 'Bữa ăn',
                    prefixIcon: Icon(Icons.schedule_rounded),
                  ),
                  items: const ['Bữa sáng', 'Bữa trưa', 'Bữa tối', 'Ăn nhẹ']
                      .map((type) => DropdownMenuItem(
                            value: type,
                            child: Text(type),
                          ))
                      .toList(),
                  onChanged: (value) =>
                      setSheetState(() => mealType = value ?? mealType),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: date,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(
                        const Duration(days: 365),
                      ),
                    );
                    if (picked != null) {
                      setSheetState(() => date = picked);
                    }
                  },
                  icon: const Icon(Icons.calendar_month_rounded),
                  label: Text('Ngày: ${_formatDate(date)}'),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: submitting
                      ? null
                      : () async {
                          if (!formKey.currentState!.validate()) return;
                          setSheetState(() => submitting = true);
                          try {
                            await grocery.updateMealPlan(
                              title: titleController.text.trim(),
                              date: _formatDateIso(date),
                              mealType: mealType,
                            );
                            if (sheetContext.mounted) {
                              Navigator.of(sheetContext).pop();
                            }
                          } catch (error) {
                            if (sheetContext.mounted) {
                              _showMessage(
                                sheetContext,
                                _errorMessage(error),
                              );
                            }
                          } finally {
                            if (sheetContext.mounted) {
                              setSheetState(() => submitting = false);
                            }
                          }
                        },
                  child: submitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Lưu kế hoạch'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    titleController.dispose();
  }

  Future<void> _deleteRecipe(
    BuildContext context,
    GroceryProvider grocery,
    Recipe recipe,
  ) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xóa công thức?'),
        content: Text('Bạn có chắc muốn xóa "${recipe.name}" không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.red),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
    if (shouldDelete != true || !context.mounted) return;
    try {
      await grocery.deleteRecipe(recipe.id);
      if (context.mounted) _showMessage(context, 'Đã xóa công thức.');
    } catch (error) {
      if (context.mounted) _showMessage(context, _errorMessage(error));
    }
  }
}

class _MealTile extends StatelessWidget {
  const _MealTile({required this.meal});

  final MealPlan meal;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 13),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.yellowLight,
              borderRadius: BorderRadius.circular(13),
            ),
            child: const Icon(Icons.restaurant_rounded,
                color: AppColors.yellow),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(meal.title,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 14)),
                const SizedBox(height: 4),
                Text(
                  [meal.mealType, meal.dateLabel]
                      .where((value) => value.isNotEmpty)
                      .join(' · '),
                  style: const TextStyle(
                      color: AppColors.muted, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _RecipeTile extends StatelessWidget {
  const _RecipeTile({
    required this.recipe,
    required this.onDelete,
    required this.isDeleting,
  });

  final Recipe recipe;
  final VoidCallback onDelete;
  final bool isDeleting;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: AppColors.greenLight,
              borderRadius: BorderRadius.circular(13),
            ),
            child: const Icon(Icons.menu_book_rounded,
                color: AppColors.green),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(recipe.name,
                    style: const TextStyle(
                        fontWeight: FontWeight.w700, fontSize: 14)),
                if (recipe.description.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    recipe.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: AppColors.muted, fontSize: 11),
                  ),
                ],
                if (recipe.duration.isNotEmpty) ...[
                  const SizedBox(height: 5),
                  Text('⏱ ${recipe.duration}',
                      style: const TextStyle(
                          color: AppColors.muted, fontSize: 10)),
                ],
              ],
            ),
          ),
          IconButton(
            tooltip: 'Xóa công thức',
            onPressed: isDeleting ? null : onDelete,
            icon: isDeleting
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.delete_outline_rounded,
                    color: AppColors.red),
          ),
        ],
      ),
    );
  }
}

class _EmptyMeals extends StatelessWidget {
  const _EmptyMeals({required this.onAdd});

  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 20),
        child: Column(
          children: [
            const Icon(Icons.calendar_month_outlined,
                size: 36, color: AppColors.muted),
            const SizedBox(height: 8),
            const Text('Chưa có kế hoạch bữa ăn',
                style: TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Lên kế hoạch'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyRecipes extends StatelessWidget {
  const _EmptyRecipes();

  @override
  Widget build(BuildContext context) {
    return const SurfaceCard(
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 18),
        child: Text(
          'Chưa có công thức nấu ăn.',
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.muted),
        ),
      ),
    );
  }
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      child: Column(
        children: [
          Text(message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.red, fontSize: 12)),
          TextButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Thử lại'),
          ),
        ],
      ),
    );
  }
}

String _formatDate(DateTime date) =>
    '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';

String _formatDateIso(DateTime date) =>
    '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';

String _errorMessage(Object error) =>
    error.toString().replaceFirst('Exception: ', '');

void _showMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}
