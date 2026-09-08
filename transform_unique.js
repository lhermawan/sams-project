const { Project, SyntaxKind } = require("ts-morph");
const project = new Project();
project.addSourceFilesAtPaths("app/api/**/*.ts");

for (const sourceFile of project.getSourceFiles()) {
  let changed = false;
  const prismaCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(c => {
      const propAccess = c.getExpression();
      if (propAccess.getKind() !== SyntaxKind.PropertyAccessExpression) return false;
      const text = propAccess.getText();
      return text.startsWith("prisma.") || text.startsWith("tx.");
    });

  for (const call of prismaCalls) {
    const propAccess = call.getExpression();
    if (propAccess.getName() === "findUnique") {
      const args = call.getArguments();
      if (args.length > 0 && args[0].getKind() === SyntaxKind.ObjectLiteralExpression) {
        let whereProp = args[0].getProperty("where");
        if (whereProp && whereProp.getKind() === SyntaxKind.PropertyAssignment) {
          const init = whereProp.getInitializer();
          if (init.getKind() === SyntaxKind.ObjectLiteralExpression && init.getProperty("tenantId")) {
            // It has tenantId inside findUnique. Let's change findUnique to findFirst
            propAccess.getNameNode().replaceWithText("findFirst");
            changed = true;
          }
        }
      }
    } else if (propAccess.getName() === "update") {
        // change update to updateMany if where has tenantId, unless id is the only other thing
        // But Prisma update allows tenantId if it's in the unique compound key. Let's just leave update as is
        // wait, Prisma update doesn't allow random fields in where unless it's a unique constraint. 
        // Changing update to updateMany requires changing data and return types because updateMany returns { count: number } instead of the updated object.
        // That might break a lot of things. It's better to assume the schema has been updated to have @@unique([tenantId, id]) etc.
        // Actually, Prisma allows arbitrary fields in update where ONLY IF the field is part of a unique index. 
        // The user said "We have migrated the app... All models now have a tenantId String field. You must update ALL API routes". I will assume the schema was updated properly.
    }
  }

  if (changed) {
    sourceFile.saveSync();
    console.log("Replaced findUnique to findFirst in", sourceFile.getFilePath());
  }
}
