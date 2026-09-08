const { Project, SyntaxKind } = require("ts-morph");
const fs = require("fs");

const project = new Project();
project.addSourceFilesAtPaths("app/api/**/*.ts");

for (const sourceFile of project.getSourceFiles()) {
  let changed = false;

  const functionDecls = sourceFile.getFunctions();
  
  for (const func of functionDecls) {
    if (func.isExported() && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(func.getName())) {
      const body = func.getBody();
      if (!body) continue;

      const authCalls = func.getDescendantsOfKind(SyntaxKind.CallExpression)
        .filter(c => c.getExpression().getText() === 'auth');
      
      if (authCalls.length > 0) {
        const ifs = func.getDescendantsOfKind(SyntaxKind.IfStatement);
        for (const ifStmt of ifs) {
          const exp = ifStmt.getExpression().getText();
          if (exp.includes('!session') && !exp.includes('tenantId')) {
            let newExp = exp.replace('!session', '!session?.user?.tenantId');
            ifStmt.getExpression().replaceWithText(newExp);
            changed = true;
          }
        }
      }
    }
  }

  const prismaCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(c => {
      const propAccess = c.getExpression();
      if (propAccess.getKind() !== SyntaxKind.PropertyAccessExpression) return false;
      const text = propAccess.getText();
      return text.startsWith("prisma.") || text.startsWith("tx.");
    });

  for (const call of prismaCalls) {
    const propAccess = call.getExpression();
    const methodName = propAccess.getName();
    
    const args = call.getArguments();
    if (args.length === 0 && ['findMany', 'findFirst', 'count'].includes(methodName)) {
      call.addArgument("{ where: { tenantId: session.user.tenantId } }");
      changed = true;
    } else if (args.length > 0 && args[0].getKind() === SyntaxKind.ObjectLiteralExpression) {
      const objLiteral = args[0];
      
      if (['findMany', 'findFirst', 'findUnique', 'count', 'delete', 'update', 'upsert', 'deleteMany'].includes(methodName)) {
        let whereProp = objLiteral.getProperty("where");
        if (whereProp && whereProp.getKind() === SyntaxKind.PropertyAssignment) {
          const whereInit = whereProp.getInitializer();
          if (whereInit.getKind() === SyntaxKind.ObjectLiteralExpression) {
            if (!whereInit.getProperty("tenantId")) {
              whereInit.addPropertyAssignment({ name: "tenantId", initializer: "session.user.tenantId" });
              changed = true;
            }
          }
        } else if (!whereProp) {
          objLiteral.addPropertyAssignment({ name: "where", initializer: "{ tenantId: session.user.tenantId }" });
          changed = true;
        }
      }
      
      if (['create', 'update', 'upsert'].includes(methodName)) {
        let dataProp = objLiteral.getProperty("data");
        if (dataProp && dataProp.getKind() === SyntaxKind.PropertyAssignment) {
          const dataInit = dataProp.getInitializer();
          if (dataInit.getKind() === SyntaxKind.ObjectLiteralExpression) {
            if (!dataInit.getProperty("tenantId")) {
              dataInit.addPropertyAssignment({ name: "tenantId", initializer: "session.user.tenantId" });
              changed = true;
            }
          } else if (dataInit.getKind() === SyntaxKind.ArrayLiteralExpression) {
             dataInit.getElements().forEach(el => {
              if (el.getKind() === SyntaxKind.ObjectLiteralExpression && !el.getProperty("tenantId")) {
                el.addPropertyAssignment({ name: "tenantId", initializer: "session.user.tenantId" });
                changed = true;
              }
            });
          }
        } else if (methodName === 'create' && !dataProp) {
          objLiteral.addPropertyAssignment({ name: "data", initializer: "{ tenantId: session.user.tenantId }" });
          changed = true;
        }
        
        if (methodName === 'upsert') {
          ['create', 'update'].forEach(key => {
            let prop = objLiteral.getProperty(key);
            if (prop && prop.getKind() === SyntaxKind.PropertyAssignment) {
              const init = prop.getInitializer();
              if (init.getKind() === SyntaxKind.ObjectLiteralExpression) {
                if (!init.getProperty("tenantId")) {
                  init.addPropertyAssignment({ name: "tenantId", initializer: "session.user.tenantId" });
                  changed = true;
                }
              }
            }
          });
        }
      }

      if (['createMany', 'updateMany'].includes(methodName)) {
        let dataProp = objLiteral.getProperty("data");
        if (dataProp && dataProp.getKind() === SyntaxKind.PropertyAssignment) {
          const dataInit = dataProp.getInitializer();
          if (dataInit.getKind() === SyntaxKind.ArrayLiteralExpression) {
            dataInit.getElements().forEach(el => {
              if (el.getKind() === SyntaxKind.ObjectLiteralExpression && !el.getProperty("tenantId")) {
                el.addPropertyAssignment({ name: "tenantId", initializer: "session.user.tenantId" });
                changed = true;
              }
            });
          }
        }
      }
    }
  }

  if (changed) {
    sourceFile.saveSync();
    console.log("Updated", sourceFile.getFilePath());
  }
}
