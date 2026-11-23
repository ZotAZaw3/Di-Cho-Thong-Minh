import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../app/theme/app_theme.dart';
import '../../features/grocery/data/grocery_models.dart';
import '../../features/grocery/state/grocery_provider.dart';
import '../../shared/widgets/app_components.dart';

class FridgeScreen extends StatelessWidget {
  const FridgeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<GroceryProvider>(
      builder: (context, grocery, _) {
        return RefreshIndicator(
          onRefresh: () async {
            await Future.wait([grocery.loadFridge(), grocery.loadFoods()]);
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
                        Text('Thực phẩm của bạn',
                            style: Theme.of(context).textTheme.headlineSmall),
                        const SizedBox(height: 4),
                        const Text(
                          'Theo dõi đồ ăn và hạn sử dụng',
                          style: TextStyle(
                              color: AppColors.muted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  IconButton.filled(
                    tooltip: 'Thêm thực phẩm',
                    onPressed: () => _showAddFood(context, grocery),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.green,
                      foregroundColor: Colors.white,
                    ),
                    icon: const Icon(Icons.add_rounded),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _FridgeSummary(items: grocery.fridgeItems),
              const SizedBox(height: 20),
              if (grocery.loadingFridge && grocery.fridgeItems.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(36),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (grocery.fridgeError != null &&
                  grocery.fridgeItems.isEmpty)
                _LoadError(
                  message: grocery.fridgeError!,
                  onRetry: grocery.loadFridge,
                )
              else if (grocery.fridgeItems.isEmpty)
                const _EmptyFridge()
              else
                ..._groupItems(grocery.fridgeItems).entries.map((entry) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SectionHeading(title: entry.key),
                        const SizedBox(height: 8),
                        SurfaceCard(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          child: Column(
                            children: [
                              for (var index = 0;
                                  index < entry.value.length;
                                  index++) ...[
                                _FridgeItemTile(item: entry.value[index]),
                                if (index < entry.value.length - 1)
                                  const Divider(height: 1),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              if (grocery.fridgeError != null &&
                  grocery.fridgeItems.isNotEmpty)
                _LoadError(
                  message: grocery.fridgeError!,
                  onRetry: grocery.loadFridge,
                ),
              const Text(
                'Kéo xuống để cập nhật danh sách',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.muted, fontSize: 11),
              ),
            ],
          ),
        );
      },
    );
  }

  Map<String, List<FridgeItem>> _groupItems(List<FridgeItem> items) {
    final grouped = <String, List<FridgeItem>>{};
    for (final item in items) {
      grouped.putIfAbsent(item.location, () => []).add(item);
    }
    return grouped;
  }

  Future<void> _showAddFood(
    BuildContext context,
    GroceryProvider grocery,
  ) async {
    await grocery.loadFoods();
    if (!context.mounted) return;

    final formKey = GlobalKey<FormState>();
    final nameController = TextEditingController();
    final quantityController = TextEditingController();
    var selectedFoodId = grocery.foods.isEmpty ? null : grocery.foods.first.id;
    var selectedUnit = grocery.foodUnits.isEmpty ? '' : grocery.foodUnits.first;
    var expiryDate = DateTime.now().add(const Duration(days: 7));
    var location = 'Tủ lạnh';
    var submitting = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) {
          FoodItem? selectedFood;
          for (final food in grocery.foods) {
            if (food.id == selectedFoodId) selectedFood = food;
          }
          final foodUnit = selectedFood?.unit ?? '';
          return Padding(
            padding: EdgeInsets.fromLTRB(
              20,
              22,
              20,
              MediaQuery.viewInsetsOf(context).bottom + 24,
            ),
            child: Form(
              key: formKey,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('Thêm thực phẩm',
                        style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 18),
                    if (grocery.foods.isNotEmpty)
                      DropdownButtonFormField<String>(
                        initialValue: selectedFoodId,
                        decoration: const InputDecoration(
                          labelText: 'Thực phẩm',
                          prefixIcon: Icon(Icons.restaurant_outlined),
                        ),
                        items: grocery.foods
                            .map((food) => DropdownMenuItem(
                                  value: food.id,
                                  child: Text(
                                    food.category.isEmpty
                                        ? food.name
                                        : '${food.name} · ${food.category}',
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ))
                            .toList(),
                        onChanged: (value) =>
                            setSheetState(() => selectedFoodId = value),
                      )
                    else
                      TextFormField(
                        controller: nameController,
                        decoration: InputDecoration(
                          labelText: 'Tên thực phẩm',
                          errorText: grocery.foodsError,
                          prefixIcon:
                              const Icon(Icons.restaurant_outlined),
                        ),
                        validator: (value) => value == null ||
                                value.trim().isEmpty
                            ? 'Vui lòng nhập tên thực phẩm'
                            : null,
                      ),
                    const SizedBox(height: 12),
                    if (foodUnit.isEmpty &&
                        grocery.foodUnits.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: DropdownButtonFormField<String>(
                          initialValue: selectedUnit,
                          decoration: const InputDecoration(
                            labelText: 'Đơn vị',
                            prefixIcon: Icon(Icons.straighten_rounded),
                          ),
                          items: grocery.foodUnits
                              .map((unit) => DropdownMenuItem(
                                    value: unit,
                                    child: Text(unit),
                                  ))
                              .toList(),
                          onChanged: (value) => setSheetState(
                            () => selectedUnit = value ?? selectedUnit,
                          ),
                        ),
                      ),
                    TextFormField(
                      controller: quantityController,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: foodUnit.isNotEmpty
                            ? 'Số lượng ($foodUnit)'
                            : 'Số lượng',
                        prefixIcon: const Icon(Icons.numbers_rounded),
                      ),
                      validator: (value) => value == null ||
                              double.tryParse(value) == null ||
                              double.parse(value) <= 0
                          ? 'Nhập số lượng lớn hơn 0'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: location,
                      decoration: const InputDecoration(
                        labelText: 'Vị trí lưu trữ',
                        prefixIcon: Icon(Icons.kitchen_outlined),
                      ),
                      items: const ['Tủ lạnh', 'Ngăn đông', 'Tủ bếp']
                          .map((value) => DropdownMenuItem(
                                value: value,
                                child: Text(value),
                              ))
                          .toList(),
                      onChanged: (value) =>
                          setSheetState(() => location = value ?? location),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: expiryDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(
                            const Duration(days: 365 * 5),
                          ),
                        );
                        if (picked != null) {
                          setSheetState(() => expiryDate = picked);
                        }
                      },
                      icon: const Icon(Icons.calendar_month_rounded),
                      label: Text(
                        'Hạn sử dụng: ${_formatDate(expiryDate)}',
                      ),
                    ),
                    const SizedBox(height: 14),
                    ElevatedButton(
                      onPressed: submitting
                          ? null
                          : () async {
                              if (!formKey.currentState!.validate()) return;
                              setSheetState(() => submitting = true);
                              try {
                                final foodName = selectedFood?.name ??
                                    nameController.text.trim();
                                await grocery.addFridgeItem(
                                  foodId: selectedFoodId ?? '',
                                  foodName: foodName,
                                  quantity: quantityController.text.trim(),
                                  unit: foodUnit.isNotEmpty
                                      ? foodUnit
                                      : selectedUnit,
                                  expiryDate:
                                      _formatDateIso(expiryDate),
                                  storageLocation: location,
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
                          : const Text('Lưu vào tủ lạnh'),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
    nameController.dispose();
    quantityController.dispose();
  }
}

class _FridgeSummary extends StatelessWidget {
  const _FridgeSummary({required this.items});

  final List<FridgeItem> items;

  @override
  Widget build(BuildContext context) {
    final expiringCount =
        items.where((item) => item.isExpired || item.expiresSoon).length;
    return SurfaceCard(
      child: Row(
        children: [
          const Icon(Icons.kitchen_rounded, color: AppColors.green, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Thực phẩm trong tủ',
                    style: TextStyle(color: AppColors.muted, fontSize: 12)),
                Text('${items.length} món',
                    style: const TextStyle(
                        fontSize: 20, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          if (expiringCount > 0)
            _StatusPill(
              text: '$expiringCount sắp hết hạn',
              color: AppColors.red,
              background: AppColors.redLight,
            ),
        ],
      ),
    );
  }
}

class _FridgeItemTile extends StatelessWidget {
  const _FridgeItemTile({required this.item});

  final FridgeItem item;

  @override
  Widget build(BuildContext context) {
    final expired = item.isExpired;
    final warning = item.expiresSoon;
    final dateColor = expired || warning ? AppColors.red : AppColors.muted;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.greenLight,
              borderRadius: BorderRadius.circular(13),
            ),
            child: const Icon(Icons.eco_rounded, color: AppColors.green),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.name,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(
                  'SL: ${item.quantity}${item.unit.isEmpty ? '' : ' ${item.unit}'}'
                  '${item.expiryDate == null ? '' : ' · HSD ${_formatDate(item.expiryDate!)}'}',
                  style: TextStyle(color: dateColor, fontSize: 11),
                ),
              ],
            ),
          ),
          if (expired || warning)
            Icon(Icons.warning_amber_rounded, color: dateColor, size: 20),
        ],
      ),
    );
  }
}

class _EmptyFridge extends StatelessWidget {
  const _EmptyFridge();

  @override
  Widget build(BuildContext context) {
    return const SurfaceCard(
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Column(
          children: [
            Icon(Icons.kitchen_outlined, size: 38, color: AppColors.muted),
            SizedBox(height: 10),
            Text('Tủ lạnh đang trống',
                style: TextStyle(fontWeight: FontWeight.w700)),
            SizedBox(height: 4),
            Text('Thêm thực phẩm để theo dõi hạn sử dụng.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.muted, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _LoadError extends StatelessWidget {
  const _LoadError({required this.message, required this.onRetry});

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

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.text,
    required this.color,
    required this.background,
  });

  final String text;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(text,
          style: TextStyle(
              color: color, fontSize: 10, fontWeight: FontWeight.w700)),
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
