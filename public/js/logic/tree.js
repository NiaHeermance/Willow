class TreeNode {
  /**
   * Constructs a {@link TreeNode}.
   * 
   * @param {String[]} [statements=[]] the logic statements within the node
   * @param {TreeNode[]} [children=[]] the children of the node
   */
  constructor(statements, children) {
    // default value of both arguments is an empty array
    this.statements = statements || [];
    // convert any string statements to objects
    for (let i = 0; i < this.statements.length; ++i) {
      const statement = this.statements[i];
      if (typeof statement === "string" || statement instanceof String) {
        this.statements[i] = {str: statement, references: []};
      }
    }

    this.children = children || [];
  }

  /**
   * Parses a raw object into a {@link TreeNode} instance.
   * 
   * @param {Object} obj the raw object
   * @returns {TreeNode} the parsed TreeNode instance 
   */
  static fromObject(obj) {
    return new TreeNode(
        obj.statements,
        obj.children.map(child => TreeNode.fromObject(child))
    );
  }

  /**
   * @returns {number} the width of the tree rooted at this node
   */
  get width() {
    if (this.children.length === 0) {
      // if this is a leaf node, the width is 1
      return 1;
    }
    let width = 0;
    // if this is a non-leaf node, then its width is the sum of the widths of its
    // children
    for (const child of this.children) {
      width += child.width;
    }
    return width;
  }

  /**
   * @returns {TreeNode} the last (rightmost) leaf node in the tree rooted at this
   * node
   */
  get lastLeaf() {
    // start at this node
    let node = this;
    while (node.children.length > 0) {
      // move to the rightmost child until we reach a leaf node
      node = node.children[node.children.length - 1];
    }
    return node;
  }

  /**
   * Determines if the statement at the given offset is valid or not.
   * 
   * @param {Number[]} branches the branch indices for this node
   * @param {Number} offset the offset of the statement
   * @returns {Boolean} if the statement is valid or not
   */
  isValid(branches, offset) {
    const statement = parseStatement(this.statements[offset].str);
    const references = Array.from(
        this.statements[offset].references,
        JSON.parse
    );
    // if this statement is not a terminator, verify that there are no backwards
    // references
    for (const reference of references) {
      if (
          !arrayStartsWith(reference.branches, branches)
          || (
              JSON.stringify(reference.branches) === JSON.stringify(branches)
              && reference.offset <= offset
          )
      ) {
        return false;
      }
    }

    const decomposition = normalize(recursiveMap(
        statement.decompose(),
        el => el.toString()
    ));
    return validateDecomposition(decomposition, references, branches, this);
  }

  /**
   * Determines if a node is closed or not. A node is closed iff it has a valid
   * close terminator or all of its grandchildren are closed.
   * 
   * @param {Number[]} branches the branch indices for this node 
   * @returns {Boolean} if this node is closed, as defined above
   */
  isClosed(branches) {
    // search for the close terminator in this branch
    let closeIdx = -1;
    for (let i = 0; i < this.statements.length; ++i) {
      if (this.statements[i].str === "×") {
        closeIdx = i;
        break;
      }
    }

    if (closeIdx === -1) {
      // if this node does not contain a close terminator, check all of its
      // grandchildren
      if (this.children.length === 0) {
        // if this node has no children, then it cannot possibly be closed
        return false;
      }
      return this.children.every(child => child.isClosed());
    }

    // otherwise, this node has a close terminator, so make sure it's valid
    return this.isValid(branches, closeIdx);
  }

  /**
   * Returns the node at the given position, determined by branch indices relative
   * to this node.
   * 
   * @param {Number[]} [branches=[]] the branch indices to follow 
   * @returns {TreeNode} the node at the position described above
   */
  child(branches) {
    let node = this;
    // follow the provided branch indices, if they exist
    for (const branch of (branches || [])) {
      node = node.children[branch];
    }
    return node;
  }

  /**
   * Clones this node (deep copy).
   * 
   * @returns {TreeNode} the cloned node
   */
  clone() {
    return new TreeNode(
        this.statements.map(statement => statement.str),
        this.children.map(child => child.clone())
    );
  }
}

function addToReferenceDict(referenceDict, branches, el) {
  const branchesStr = JSON.stringify(branches);
  if (!(branchesStr in referenceDict)) {
    referenceDict[branchesStr] = [];

    const parentBranches = [...branches];
    parentBranches.pop();
    addToReferenceDict(
        referenceDict,
        parentBranches,
        referenceDict[branchesStr]
    );
  }

  referenceDict[branchesStr].push(el);
}

function validateDecomposition(decomposition, references, branches, node) {
  const referenceDict = {};
  // initialize the root branch to an empty array
  referenceDict[JSON.stringify(branches)] = [];
  for (const reference of references) {
    addToReferenceDict(
        referenceDict,
        reference.branches,
        parseStatement(
            root.node.child(reference.branches).statements[reference.offset].str
        ).toString()
    );
  }

  const unorderedReferences = referenceDict[JSON.stringify(branches)];
  if (decomposition === normalize(unorderedReferences)) {
    return true;
  }

  if (node.children.length === 0) {
    return false;
  }

  for (let i = 0; i < node.children.length; ++i) {
    // check if the statement is decomposed in each child branch
    const childBranches = [...branches, i];
    // filter references only in this child branch
    const branchReferences = references.filter(
        reference => arrayStartsWith(reference.branches, childBranches)
    );
    if (!validateDecomposition(
        decomposition,
        branchReferences,
        childBranches,
        node.children[i]
    )) {
      // if this statement is not decomposed in this child branch, then the
      // decomposition is invalid
      return false;
    }
  }
  // if this statement is decomposed in each child branch, then the decomposition
  // is valid
  return true;
}

/**
 * Determines if a branch is able to be closed, which is when the branch contains
 * both a literal and its negation.
 * 
 * @param {Statement[]} branch the branch
 * @returns {boolean} if the branch can be closed
 */
function canCloseBranch(branch) {
  // convert the branch to a set of strings for constant-time lookup
  // TODO: define toString for Statement
  branch = Set(branch.map(statement => statement.toString()));

  for (const statement of branch) {
    if (statement.isLiteral()) {
      // if the statement is a literal, check if the branch contains its negation
      if (statement instanceof NotStatement &&
          branch.has(statement.operand.toString())) {
        // if the statement is a NotStatement, check if the branch contains its
        // operand
        return true;
      } else if (branch.has(new NotStatement(statement).toString())) {
        // if the statement is an AtomicStatement, check if the branch contains
        // its negation
        return true;
      }
    }
  }
  // if none of the statements had a negation contained in the branch, then the
  // branch cannot be closed
  return false;
}
