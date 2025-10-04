import {
  DataKind,
  DataKindLattice,
  TypeChecker,
  PortContract,
  COERCION_GRAPH
} from './data-kinds';

describe('DataKindLattice', () => {
  describe('isSubtype', () => {
    it('should return true for identical types', () => {
      expect(DataKindLattice.isSubtype(DataKind.TEXT_PLAIN, DataKind.TEXT_PLAIN)).toBe(true);
    });

    it('should return true for direct supertype relationships', () => {
      expect(DataKindLattice.isSubtype(DataKind.TEXT_MARKDOWN, DataKind.TEXT_PLAIN)).toBe(true);
      expect(DataKindLattice.isSubtype(DataKind.HTML_URL, DataKind.URI)).toBe(true);
      expect(DataKindLattice.isSubtype(DataKind.JSON, DataKind.TEXT_PLAIN)).toBe(true);
    });

    it('should return true for transitive supertype relationships', () => {
      expect(DataKindLattice.isSubtype(DataKind.TEXT_SEMANTIC, DataKind.TEXT_PLAIN)).toBe(true);
      expect(DataKindLattice.isSubtype(DataKind.TEXT_SEMANTIC, DataKind.TEXT_MARKDOWN)).toBe(true);
    });

    it('should return false for unrelated types', () => {
      expect(DataKindLattice.isSubtype(DataKind.DOM_CLIPBOARD, DataKind.TEXT_PLAIN)).toBe(false);
      expect(DataKindLattice.isSubtype(DataKind.FILE_PATH, DataKind.URI)).toBe(false);
    });
  });

  describe('join (least upper bound)', () => {
    it('should return the more specific type when one is subtype of the other', () => {
      expect(DataKindLattice.join(DataKind.TEXT_MARKDOWN, DataKind.TEXT_PLAIN)).toBe(DataKind.TEXT_PLAIN);
      expect(DataKindLattice.join(DataKind.TEXT_PLAIN, DataKind.TEXT_MARKDOWN)).toBe(DataKind.TEXT_PLAIN);
    });

    it('should return null when types are unrelated', () => {
      expect(DataKindLattice.join(DataKind.DOM_CLIPBOARD, DataKind.TEXT_PLAIN)).toBe(null);
      expect(DataKindLattice.join(DataKind.FILE_PATH, DataKind.URI)).toBe(null);
    });
  });

  describe('meet (greatest lower bound)', () => {
    it('should return the more specific type when one is subtype of the other', () => {
      expect(DataKindLattice.meet(DataKind.TEXT_MARKDOWN, DataKind.TEXT_PLAIN)).toBe(DataKind.TEXT_MARKDOWN);
      expect(DataKindLattice.meet(DataKind.TEXT_PLAIN, DataKind.TEXT_MARKDOWN)).toBe(DataKind.TEXT_MARKDOWN);
    });

    it('should return null when types are unrelated', () => {
      expect(DataKindLattice.meet(DataKind.DOM_CLIPBOARD, DataKind.TEXT_PLAIN)).toBe(null);
    });
  });

  describe('getAllSupertypes', () => {
    it('should return all supertypes including self', () => {
      const supertypes = DataKindLattice.getAllSupertypes(DataKind.TEXT_SEMANTIC);
      expect(supertypes).toContain(DataKind.TEXT_SEMANTIC);
      expect(supertypes).toContain(DataKind.TEXT_MARKDOWN);
      expect(supertypes).toContain(DataKind.TEXT_PLAIN);
    });

    it('should return only self for base types', () => {
      const supertypes = DataKindLattice.getAllSupertypes(DataKind.DOM_CLIPBOARD);
      expect(supertypes).toEqual([DataKind.DOM_CLIPBOARD]);
    });
  });

  describe('areCompatible', () => {
    it('should return true for subtype relationships', () => {
      const source: PortContract = { dataKind: DataKind.TEXT_MARKDOWN, facets: {}, constraints: {} };
      const target: PortContract = { dataKind: DataKind.TEXT_PLAIN, facets: {}, constraints: {} };
      expect(DataKindLattice.areCompatible(source, target)).toBe(true);
    });

    it('should return true when coercion exists', () => {
      const source: PortContract = { dataKind: DataKind.DOM_CLIPBOARD, facets: {}, constraints: {} };
      const target: PortContract = { dataKind: DataKind.HTML_URL, facets: {}, constraints: {} };
      expect(DataKindLattice.areCompatible(source, target)).toBe(true);
    });

    it('should return false when no relationship exists', () => {
      const source: PortContract = { dataKind: DataKind.DOM_CLIPBOARD, facets: {}, constraints: {} };
      const target: PortContract = { dataKind: DataKind.FILE_PATH, facets: {}, constraints: {} };
      expect(DataKindLattice.areCompatible(source, target)).toBe(false);
    });
  });

  describe('findBestCoercion', () => {
    it('should return the coercion with lowest cost', () => {
      const coercion = DataKindLattice.findBestCoercion(DataKind.TEXT_PLAIN, DataKind.TEXT_MARKDOWN);
      expect(coercion).toBeDefined();
      expect(coercion?.cost).toBe(1);
      expect(coercion?.safe).toBe(true);
    });

    it('should return null when no coercion exists', () => {
      const coercion = DataKindLattice.findBestCoercion(DataKind.DOM_CLIPBOARD, DataKind.FILE_PATH);
      expect(coercion).toBe(null);
    });
  });
});

describe('TypeChecker', () => {
  describe('checkPortCompatibility', () => {
    const createPort = (dataKind: DataKind): PortContract => ({
      dataKind,
      facets: {},
      constraints: {}
    });

    it('should return compatible for subtype relationships', () => {
      const source = createPort(DataKind.TEXT_MARKDOWN);
      const target = createPort(DataKind.TEXT_PLAIN);

      const result = TypeChecker.checkPortCompatibility(source, target);
      expect(result.compatible).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return compatible with coercion chain', () => {
      const source = createPort(DataKind.DOM_CLIPBOARD);
      const target = createPort(DataKind.HTML_URL);

      const result = TypeChecker.checkPortCompatibility(source, target);
      expect(result.compatible).toBe(true);
      expect(result.coercionChain).toBeDefined();
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.warnings).toContain('Coercion chain contains unsafe conversions that may require user consent');
    });

    it('should return incompatible when no path exists', () => {
      const source = createPort(DataKind.DOM_CLIPBOARD);
      const target = createPort(DataKind.FILE_PATH);

      const result = TypeChecker.checkPortCompatibility(source, target);
      expect(result.compatible).toBe(false);
      expect(result.errors).toContain('No coercion path from dom/clipboard to file/path');
    });
  });

  describe('validateWorkflowEdges', () => {
    const createNode = (id: string, inputKinds: DataKind[], outputKinds: DataKind[]) => ({
      id,
      input_ports: inputKinds.map((kind, index) => ({
        dataKind: kind,
        id: `input_${index}`,
        name: `Input ${index}`,
        facets: {},
        constraints: {}
      })),
      output_ports: outputKinds.map((kind, index) => ({
        dataKind: kind,
        id: `output_${index}`,
        name: `Output ${index}`,
        facets: {},
        constraints: {}
      }))
    });

    it('should validate compatible edges', () => {
      const nodes = [
        createNode('source', [], [DataKind.TEXT_MARKDOWN]),
        createNode('target', [DataKind.TEXT_PLAIN], [])
      ];

      const edges = [
        {
          source_node_id: 'source',
          target_node_id: 'target',
          source_port: DataKind.TEXT_MARKDOWN,
          target_port: DataKind.TEXT_PLAIN
        }
      ];

      const results = TypeChecker.validateWorkflowEdges(nodes, edges);
      expect(results).toHaveLength(1);
      expect(results[0].result.compatible).toBe(true);
    });

    it('should detect incompatible edges', () => {
      const nodes = [
        createNode('source', [], [DataKind.DOM_CLIPBOARD]),
        createNode('target', [DataKind.FILE_PATH], [])
      ];

      const edges = [
        {
          source_node_id: 'source',
          target_node_id: 'target',
          source_port: DataKind.DOM_CLIPBOARD,
          target_port: DataKind.FILE_PATH
        }
      ];

      const results = TypeChecker.validateWorkflowEdges(nodes, edges);
      expect(results).toHaveLength(1);
      expect(results[0].result.compatible).toBe(false);
    });
  });

  describe('validateFacets', () => {
    it('should warn about encoding mismatches', () => {
      const source = { encoding: 'utf-8' };
      const target = { encoding: 'ascii' };

      const result = TypeChecker.validateFacets(source, target);
      expect(result.warnings).toContain('Encoding mismatch: utf-8 → ascii');
    });

    it('should warn about locale mismatches', () => {
      const source = { locale: 'en-US' };
      const target = { locale: 'zh-CN' };

      const result = TypeChecker.validateFacets(source, target);
      expect(result.warnings).toContain('Locale mismatch: en-US → zh-CN');
    });

    it('should error on size constraint violations', () => {
      const source = { size: { max: 1000 } };
      const target = { size: { max: 500 } };

      const result = TypeChecker.validateFacets(source, target);
      expect(result.errors).toContain('Source size (1000) exceeds target maximum (500)');
    });
  });
});

describe('Coercion Graph', () => {
  it('should contain all expected coercions', () => {
    expect(COERCION_GRAPH).toContainEqual(
      expect.objectContaining({
        from: DataKind.TEXT_PLAIN,
        to: DataKind.TEXT_MARKDOWN,
        cost: 1,
        safe: true
      })
    );

    expect(COERCION_GRAPH).toContainEqual(
      expect.objectContaining({
        from: DataKind.DOM_CLIPBOARD,
        to: DataKind.HTML_URL,
        cost: 5,
        safe: false
      })
    );
  });

  it('should have unique coercion paths', () => {
    const paths = COERCION_GRAPH.map(c => `${c.from}->${c.to}`);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length);
  });
});