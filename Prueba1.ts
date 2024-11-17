import EventEmitter from 'node:events';
const eventEmitter = new EventEmitter();


// Lista de tipados de interface
interface ITaskRaw {
    description: string,
    status: 'pending' | 'completed' | 'inProgress',
    limitDate: Date
}

interface ITask extends ITaskRaw {
    id: number
}

interface IProject {
    id: number,
    name: string,
    tasksList: ITask[]
}


// Seteo de listeners para los eventos de updateo y tarea completada
eventEmitter.on('updateTask', ({ taskId, newStatus }: { taskId: number, newStatus: 'pending' | 'completed' | 'inProgress', }) => {
    console.log(`updated task ${taskId} with status ${newStatus}`);
});

eventEmitter.on('completedTask', (id: number) => {
    console.log(`task ${id} completed`)
})

// Contenedor global de proyectos en general
const projectList: IProject[] = []

// funcion generadora de nuevos proyectos, los pushea al array global
const CreateNewProject = ({ id, name, tasksList = [] }: IProject): IProject => {
    projectList.push({
        id,
        name,
        tasksList
    })
    return {
        id,
        name,
        tasksList
    }
}

// funcion para agregar nuevas tareas
const addNewTask = (project: IProject,
    { description, status, limitDate }: ITaskRaw
) => {
    const { tasksList } = project
    // aca conseidera la cantidad de tareas previo, haciendo que el id de estas sea autoincremental
    const newTask = {
        id: tasksList.length + 1,
        description, status, limitDate
    }
    tasksList.push(newTask)
}

// funcion para obtener resumen de la misma, tanto en formato string como en un objeto
const projectSummary = ({ tasksList, name }: IProject) => {
    // para ir acumulando y contando cada status de cada tarea
    const { pending, inProgress, completed } = tasksList.reduce((acc, { status }) => {
        switch (status) {
            case 'pending':
                acc.pending += 1
                break;
            case 'inProgress':
                acc.inProgress += 1
                break;
            default:
                acc.completed += 1
        }
        return acc
    }, { pending: 0, inProgress: 0, completed: 0 })

    return { text: `Summary of project ${name}:   pending: ${pending}, in progress: ${inProgress}, completed: ${completed}`, rawData: { pending, inProgress, completed } }
}

// genera un nuevo arreglo del proyecto con las tareas ordenadas segun fecha. Puede ser ascendente o descendente
const sortTaskProject = ({ tasksList }: IProject, orderList: 'asc' | 'desc' = 'asc') => {

    return [...tasksList].sort(({ limitDate: projALimitDate }, { limitDate: projBLimitDate }) => {
        if (orderList === 'asc') {
            return projALimitDate.getTime() - projBLimitDate.getTime()
        }
        return projBLimitDate.getTime() - projALimitDate.getTime()
    })
}

// Define el filtro a utilizar para las tareas de un proyecto. El parametro de filterFunction es un check que actuaria
// similar al contenido de un [].filter()
const filterProjectTasks = (tasksList: ITask[], filterFunction: (task: ITask) => boolean) => {
    return tasksList.filter(filterFunction)
}

// funcion par obtener la diferencia de dias entre 2 fechas
const diffDays = (dateA: Date, dateB: Date) => {
    return (Math.ceil((dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24)))
}

// Obtener la cantidad de dias restantes a tareas pendientes (pending o inProgress). 
// si la fecha limite supera a la fecha de hoy, se considera como 0 ya que vencio
// (en estos casos debiese de poder asignarse un status "failed" o "delayed")
// si es menor, se compara la cantidad de dias restantes hasta alcanzar la fecha de hoy
const getRemainingTime = ({ tasksList }: IProject) => {
    const pendingTask = filterProjectTasks(tasksList, ({ status }: ITask) => status !== 'completed')
    const currentDate = new Date()
    // va sumando todos los casos donde aun existe tiempo para completar la tarea, considerando solo si esta 
    // tarea todavia no ha vencido.
    const { totalDays } = pendingTask.reduce((acc, { limitDate }) => {
        if (limitDate > currentDate) {
            const remainingDays = diffDays(limitDate, currentDate)
            acc.totalDays += remainingDays
        }
        return acc
    }, { totalDays: 0 })
    return totalDays
}

// Considera solo aquellas tareas que tengan una fecha limite menor a 3
// que aun no esten completadas
const getCriticalTask = ({ tasksList }: IProject) => {
    const currentDate = new Date()
    console.log(currentDate)
    const notCompletedTask = filterProjectTasks(tasksList, ({ status, limitDate }: ITask) => {
        const remainingDays = diffDays(limitDate, currentDate)
        console.log(currentDate, remainingDays, limitDate)
        if (status !== 'completed' && remainingDays > 0 && remainingDays < 3) {
            return true
        }
        return false
    })
    return notCompletedTask
}


// simulacion de llamado para obtener el detalle de un proyecto basado en su projectID
const loadProjectDetail = (projectId: number): Promise<IProject> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const project = projectList.find(({ id }) => projectId === id)
            // para setear en caso que falle conexión u otro aspecto del llamado
            if (false) {
                reject(`Error getting data from ${projectId}`)
                return
            }
            // especificamente para notificar que ID no existe 
            if (!project) {
                reject(`project with ID: ${projectId} not found`)
                return
            }
            resolve(project)
        }, 1500);
    });
}

// funcion para obtener la data de un proyecto segun su projectID
const getDataProjectDetail = async (id: number) => {
    try {
        const dataProject = await loadProjectDetail(id)
        return dataProject
    }
    catch (e) {
        throw new Error(e)
    }
}

// simulación de llamado para setear un nuevo status a una tarea, esta emitiria el evento asociado a la tarea
// se ha de entregar el proyecto y el id de la tarea, junto a su nuevo status
const setNewStatusTask = (project: IProject, taskId: number, newStatus: 'pending' | 'completed' | 'inProgress') => {
    return new Promise((resolve, reject) => {
        const { tasksList, name, id } = project
        setTimeout(() => {

            const task = tasksList.find((task) => task.id === taskId)
            if (!task) {
                reject(`task ${taskId} not found in project ${name} id: ${id}`)
                return
            }
            if (false) {
                reject(`Error getting data for taskId ${taskId}`)
                return
            }
            // evita carga innecesaria en caso que la tarea ya tenga el status respectivo
            if (task.status === newStatus) {
                reject(`task ${taskId} already has the status ${newStatus}`)
                return
            }
            // emite un evento especial en el caso que la tarea se haya completado
            if (newStatus === 'completed') {
                eventEmitter.emit('completedTask', taskId)
            }
            else {
                eventEmitter.emit('updateTask', ({ taskId, newStatus }))
            }
            task.status === newStatus
        }, 2500);
    })
}

// función para actualizar el estado de una tarea
const updateStatusTask = async (project: IProject, taskId: number, newStatus: 'pending' | 'completed' | 'inProgress') => {
    try {
        await setNewStatusTask(project, taskId, newStatus)
    } catch (e) {
        console.log(e)
        throw new Error(e)

    }
}

const project1: IProject = CreateNewProject({ id: 1, name: 'Project Alpha', tasksList: [] });
const project2: IProject = CreateNewProject({ id: 2, name: 'Project Beta', tasksList: [] });

const dates = [
    new Date(new Date().setMonth(new Date().getMonth() - 1)),
    new Date(new Date().setMonth(new Date().getMonth() + 1)),
    new Date(new Date().setDate(new Date().getDate() + 2)),
    new Date(new Date().setDate(new Date().getDate() + 3)),
    new Date(new Date().setDate(new Date().getDate() - 2)),
    new Date(new Date().setDate(new Date().getDate() + 15)),
    new Date(new Date().setDate(new Date().getDate() - 15)),
    new Date(new Date().setDate(new Date().getDate() + 2)),
    new Date(new Date().setDate(new Date().getDate() + 1)),
    new Date(new Date().setDate(new Date().getDate() - 1)),
];

// Agregar tareas a project1
addNewTask(project1, { description: 'Task A', status: 'pending', limitDate: dates[0] });
addNewTask(project1, { description: 'Task B', status: 'inProgress', limitDate: dates[1] });
addNewTask(project1, { description: 'Task C', status: 'completed', limitDate: dates[2] });
addNewTask(project1, { description: 'Task D', status: 'pending', limitDate: dates[3] });
addNewTask(project1, { description: 'Task E', status: 'inProgress', limitDate: dates[4] });
addNewTask(project1, { description: 'Task F', status: 'completed', limitDate: dates[5] });
addNewTask(project1, { description: 'Task G', status: 'pending', limitDate: dates[6] });
addNewTask(project1, { description: 'Task EG', status: 'inProgress', limitDate: dates[7] });
addNewTask(project1, { description: 'Task Fh', status: 'inProgress', limitDate: dates[8] });
addNewTask(project1, { description: 'Task GJ', status: 'pending', limitDate: dates[9] });

// Agregar tareas a project2
addNewTask(project2, { description: 'Task H', status: 'inProgress', limitDate: dates[6] });
addNewTask(project2, { description: 'Task I', status: 'inProgress', limitDate: dates[1] });
addNewTask(project2, { description: 'Task J', status: 'pending', limitDate: dates[4] });
addNewTask(project2, { description: 'Task K', status: 'inProgress', limitDate: dates[0] });
addNewTask(project2, { description: 'Task L', status: 'inProgress', limitDate: dates[3] });
addNewTask(project2, { description: 'Task M', status: 'completed', limitDate: dates[5] });
addNewTask(project2, { description: 'Task N', status: 'completed', limitDate: dates[2] });

// testeo clogs
console.log("List of projects", projectList)
console.log("Project 1", project1)
// console.log("proyecto 2", project2)


const summaryProject1 = projectSummary(project1)
const summaryProject2 = projectSummary(project2)

console.log("summary project 1:", summaryProject1)
// console.log(summaryProject2)

const project1SortedAsc = sortTaskProject(project1)
const project2SortedDesc = sortTaskProject(project2, 'asc')

console.log("Project sorted by date Asc", project1SortedAsc)

const remainingTimeProject1 = getRemainingTime(project1);
console.log('Remaining Time for not completed Tasks:', remainingTimeProject1);

const criticalTasksProject1 = getCriticalTask(project1);
console.log('Critical Tasks:', criticalTasksProject1);


const testPromiseDetail = async (id: number) => {
    try {
        const projectDetails = await getDataProjectDetail(id);
        console.log(`Project Details id: ${id}`, projectDetails);
    }
    catch (e) {
        console.log(e)
    }
}

testPromiseDetail(1);
testPromiseDetail(4);



updateStatusTask(project1, 1, 'completed');
updateStatusTask(project1, 21, 'completed');
updateStatusTask(project1, 8, 'inProgress');
updateStatusTask(project1, 10, 'inProgress');