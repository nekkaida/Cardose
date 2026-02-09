import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Divider,
  IconButton,
} from 'react-native-paper';
import { useAuthenticatedFetch } from '../../hooks/useAuthenticatedFetch';
import { theme } from '../../theme/theme';

interface Material {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
}

interface PricingResult {
  breakdown: {
    materialCost: number;
    laborCost: number;
    overheadCost: number;
    subtotal: number;
    markupAmount: number;
    discountAmount: number;
    afterDiscount: number;
    ppnAmount: number;
    finalPrice: number;
  };
  profitAnalysis: {
    profit: number;
    profitMargin: number;
    costBreakdown: {
      materials: number;
      labor: number;
      overhead: number;
    };
  };
}

export const PricingCalculatorScreen: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([
    { id: '1', name: '', quantity: 0, unitCost: 0 },
  ]);
  const [laborHours, setLaborHours] = useState('0');
  const [overheadPercentage, setOverheadPercentage] = useState('10');
  const [markupPercentage, setMarkupPercentage] = useState('50');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<PricingResult | null>(null);

  const authenticatedFetch = useAuthenticatedFetch();

  const addMaterial = () => {
    setMaterials([
      ...materials,
      { id: Date.now().toString(), name: '', quantity: 0, unitCost: 0 },
    ]);
  };

  const removeMaterial = (id: string) => {
    if (materials.length > 1) {
      setMaterials(materials.filter((m) => m.id !== id));
    }
  };

  const updateMaterial = (id: string, field: keyof Material, value: any) => {
    setMaterials(
      materials.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    );
  };

  const calculatePricing = async () => {
    try {
      setCalculating(true);

      const requestData = {
        materials: materials
          .filter((m) => m.name && m.quantity > 0 && m.unitCost > 0)
          .map((m) => ({
            name: m.name,
            quantity: m.quantity,
            unitCost: m.unitCost,
          })),
        laborHours: parseFloat(laborHours) || 0,
        overheadPercentage: parseFloat(overheadPercentage) || 0,
        markupPercentage: parseFloat(markupPercentage) || 0,
        discountAmount: parseFloat(discountAmount) || 0,
      };

      const response = await authenticatedFetch('/financial/calculate-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data.pricing);
      } else {
        Alert.alert('Error', data.error || 'Failed to calculate pricing');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error calculating pricing');
      console.error('Calculate pricing error:', error);
    } finally {
      setCalculating(false);
    }
  };

  const resetForm = () => {
    setMaterials([{ id: '1', name: '', quantity: 0, unitCost: 0 }]);
    setLaborHours('0');
    setOverheadPercentage('10');
    setMarkupPercentage('50');
    setDiscountAmount('0');
    setResult(null);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Materials" />
        <Card.Content>
          {materials.map((material, index) => (
            <View key={material.id} style={styles.materialRow}>
              <Text style={styles.materialNumber}>{index + 1}.</Text>
              <View style={styles.materialInputs}>
                <TextInput
                  label="Material Name"
                  value={material.name}
                  onChangeText={(text) => updateMaterial(material.id, 'name', text)}
                  style={styles.materialNameInput}
                  mode="outlined"
                  dense
                />
                <TextInput
                  label="Quantity"
                  value={material.quantity.toString()}
                  onChangeText={(text) =>
                    updateMaterial(material.id, 'quantity', parseFloat(text) || 0)
                  }
                  keyboardType="numeric"
                  style={styles.smallInput}
                  mode="outlined"
                  dense
                />
                <TextInput
                  label="Unit Cost"
                  value={material.unitCost.toString()}
                  onChangeText={(text) =>
                    updateMaterial(material.id, 'unitCost', parseFloat(text) || 0)
                  }
                  keyboardType="numeric"
                  style={styles.smallInput}
                  mode="outlined"
                  dense
                />
              </View>
              {materials.length > 1 && (
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => removeMaterial(material.id)}
                />
              )}
            </View>
          ))}
          <Button mode="outlined" onPress={addMaterial} style={styles.addButton}>
            Add Material
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Labor & Overhead" />
        <Card.Content>
          <TextInput
            label="Labor Hours"
            value={laborHours}
            onChangeText={setLaborHours}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            right={<TextInput.Affix text="hours" />}
          />
          <Text style={styles.helperText}>Labor rate: IDR 50,000/hour</Text>

          <TextInput
            label="Overhead Percentage"
            value={overheadPercentage}
            onChangeText={setOverheadPercentage}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            right={<TextInput.Affix text="%" />}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Pricing Strategy" />
        <Card.Content>
          <TextInput
            label="Markup Percentage"
            value={markupPercentage}
            onChangeText={setMarkupPercentage}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            right={<TextInput.Affix text="%" />}
          />

          <TextInput
            label="Discount Amount"
            value={discountAmount}
            onChangeText={setDiscountAmount}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            right={<TextInput.Affix text="IDR" />}
          />
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={calculatePricing}
          loading={calculating}
          disabled={calculating}
          style={styles.calculateButton}
        >
          Calculate
        </Button>
        <Button mode="outlined" onPress={resetForm} style={styles.resetButton}>
          Reset
        </Button>
      </View>

      {result && (
        <Card style={styles.card}>
          <Card.Title title="Pricing Results" />
          <Card.Content>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Material Cost:</Text>
              <Text style={styles.resultValue}>
                {formatCurrency(result.breakdown.materialCost)}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Labor Cost:</Text>
              <Text style={styles.resultValue}>
                {formatCurrency(result.breakdown.laborCost)}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Overhead Cost:</Text>
              <Text style={styles.resultValue}>
                {formatCurrency(result.breakdown.overheadCost)}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Subtotal:</Text>
              <Text style={styles.resultValue}>
                {formatCurrency(result.breakdown.subtotal)}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Markup:</Text>
              <Text style={styles.resultValue}>
                {formatCurrency(result.breakdown.markupAmount)}
              </Text>
            </View>

            {result.breakdown.discountAmount > 0 && (
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Discount:</Text>
                <Text style={[styles.resultValue, styles.discount]}>
                  -{formatCurrency(result.breakdown.discountAmount)}
                </Text>
              </View>
            )}

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>PPN (11%):</Text>
              <Text style={styles.resultValue}>
                {formatCurrency(result.breakdown.ppnAmount)}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Final Price:</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(result.breakdown.finalPrice)}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Profit Analysis</Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Profit:</Text>
              <Text style={[styles.resultValue, styles.profit]}>
                {formatCurrency(result.profitAnalysis.profit)}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Profit Margin:</Text>
              <Text style={[styles.resultValue, styles.profit]}>
                {formatPercentage(result.profitAnalysis.profitMargin)}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Cost Breakdown</Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Materials:</Text>
              <Text style={styles.resultValue}>
                {formatPercentage(result.profitAnalysis.costBreakdown.materials)}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Labor:</Text>
              <Text style={styles.resultValue}>
                {formatPercentage(result.profitAnalysis.costBreakdown.labor)}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Overhead:</Text>
              <Text style={styles.resultValue}>
                {formatPercentage(result.profitAnalysis.costBreakdown.overhead)}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  materialNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    color: theme.colors.text,
  },
  materialInputs: {
    flex: 1,
    gap: 8,
  },
  materialNameInput: {
    flex: 1,
  },
  smallInput: {
    flex: 1,
  },
  input: {
    marginBottom: 12,
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    marginTop: -8,
  },
  addButton: {
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  calculateButton: {
    flex: 1,
  },
  resetButton: {
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  resultValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  discount: {
    color: '#4CAF50',
  },
  profit: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
});
